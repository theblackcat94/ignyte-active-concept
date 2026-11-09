import type { SupabaseClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/commerce";
import { adminOrderEmail, orderDeliveredEmail, orderDispatchedEmail, orderRequestEmail, paymentConfirmedEmail, type EmailDesign, type EmailOrder } from "@/lib/email-templates";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";

type OrderRow = {
  id: string;
  user_id: string | null;
  status: string;
  shipping_status: "not_dispatched" | "dispatched" | "delivered";
  carrier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  customer_email: string | null;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number | null;
  total_cents: number | null;
  order_items: { product_name: string; size: string; quantity: number; unit_price_cents: number }[];
};

function orderEmailData(row: OrderRow, siteUrl: string): EmailOrder {
  return {
    id: row.id,
    items: (row.order_items ?? []).map(item => ({ name: item.product_name, size: item.size,
      quantity: item.quantity, unitPriceCents: item.unit_price_cents })),
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents ?? 0,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    viewUrl: `${siteUrl}/${row.user_id ? "account" : "guest"}/orders/${row.id}/`,
  };
}

async function loadOrder(db: SupabaseClient, orderId: string): Promise<OrderRow> {
  const { data, error } = await db.from("orders").select(
    "id,user_id,status,shipping_status,carrier_name,tracking_number,tracking_url,customer_email,subtotal_cents,discount_cents,shipping_cents,total_cents,order_items(product_name,size,quantity,unit_price_cents)"
  ).eq("id", orderId).single();
  if (error || !data) throw new Error("Order email data could not be loaded");
  return data as unknown as OrderRow;
}

async function enqueue(db: SupabaseClient, orderId: string, event: string, recipient: string, message: EmailDesign) {
  const { error } = await db.from("email_outbox").upsert({
    event_key: `${orderId}:${event}:${recipient.toLowerCase()}`,
    order_id: orderId,
    recipient,
    subject: message.subject,
    html_body: message.html,
    text_body: message.text,
  }, { onConflict: "event_key", ignoreDuplicates: true });
  if (error) throw new Error("Order email could not be queued");
}

async function dispatchOrderOutbox(db: SupabaseClient, orderId: string) {
  if (!sesMailConfigured()) return;
  const { data: pending, error } = await db.from("email_outbox")
    .select("id,recipient,subject,html_body,text_body,attempt_count")
    .eq("order_id", orderId).is("sent_at", null).order("created_at").limit(10);
  if (error) throw new Error("Order email outbox could not be read");
  for (const row of pending ?? []) {
    try {
      await sendSesMail({ to: row.recipient, message: { subject: row.subject, html: row.html_body, text: row.text_body } });
      const { error: updateError } = await db.from("email_outbox").update({ sent_at: new Date().toISOString(),
        attempt_count: row.attempt_count + 1, last_error: null }).eq("id", row.id).is("sent_at", null);
      if (updateError) console.error("Could not record sent order email", row.id);
    } catch (error) {
      const { error: updateError } = await db.from("email_outbox").update({ attempt_count: row.attempt_count + 1,
        last_error: error instanceof Error ? error.message : "SES delivery failed" }).eq("id", row.id).is("sent_at", null);
      console.error("Order email delivery failed", row.id, updateError ? "outbox update failed" : "queued for retry");
    }
  }
}

export async function queueOrderRequestEmails(orderId: string) {
  const db = adminDb();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const alertAddress = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!siteUrl || !alertAddress) throw new Error("Order email recipients or site URL are not configured");
  const row = await loadOrder(db, orderId);
  if (!row.customer_email || row.status !== "awaiting_payment") return;
  const order = orderEmailData(row, siteUrl);
  await Promise.all([
    enqueue(db, orderId, "order-request", row.customer_email, orderRequestEmail(order, siteUrl)),
    enqueue(db, orderId, "order-request-alert", alertAddress, adminOrderEmail(order, "awaiting payment", row.customer_email, siteUrl)),
  ]);
  await dispatchOrderOutbox(db, orderId);
}

export async function queuePaymentConfirmedEmails(orderId: string) {
  const db = adminDb();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const alertAddress = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!siteUrl || !alertAddress) throw new Error("Order email recipients or site URL are not configured");
  const row = await loadOrder(db, orderId);
  if (!row.customer_email || row.status !== "paid") return;
  const order = orderEmailData(row, siteUrl);
  await Promise.all([
    enqueue(db, orderId, "payment-confirmed", row.customer_email, paymentConfirmedEmail(order, siteUrl)),
    enqueue(db, orderId, "payment-confirmed-alert", alertAddress, adminOrderEmail(order, "paid", row.customer_email, siteUrl)),
  ]);
  await dispatchOrderOutbox(db, orderId);
}

export async function queueMintsoftShippingEmail(orderId: string, event: "dispatched" | "delivered") {
  const db = adminDb();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) throw new Error("Site URL is not configured");
  const row = await loadOrder(db, orderId);
  if (!row.customer_email || row.status !== "paid") return;
  if (event === "dispatched" && row.shipping_status !== "dispatched") return;
  if (event === "delivered" && row.shipping_status !== "delivered") return;
  const viewUrl = orderEmailData(row, siteUrl).viewUrl!;
  const message = event === "dispatched"
    ? orderDispatchedEmail(row.id, row.carrier_name, row.tracking_number, row.tracking_url, viewUrl, siteUrl)
    : orderDeliveredEmail(row.id, viewUrl, siteUrl);
  await enqueue(db, orderId, `mintsoft-${event}`, row.customer_email, message);
  await dispatchOrderOutbox(db, orderId);
}

export async function retryPendingOrderEmails() {
  if (!sesMailConfigured()) return { sent: 0, configured: false };
  const db = adminDb();
  const { data: pending, error } = await db.from("email_outbox").select("id,order_id")
    .is("sent_at", null).order("created_at").limit(50);
  if (error) throw new Error("Order email outbox could not be read");
  for (const orderId of [...new Set((pending ?? []).map(row => row.order_id))]) {
    await dispatchOrderOutbox(db, orderId);
  }
  return { attempted: pending?.length ?? 0, configured: true };
}
