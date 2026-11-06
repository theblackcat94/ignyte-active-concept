import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { returnStatuses, type ReturnItem } from "@/lib/returns";
import { returnApprovalEmail, returnInstructionsEmail, returnRefundEmail, type ReturnMailRecord } from "@/lib/return-emails";
import { queueReturnEmail, returnMailEnabled } from "@/lib/return-outbox";

export const runtime = "nodejs";
const settingsSchema = z.object({ return_address: z.string().trim().max(500), shipping_instructions: z.string().trim().max(2000), refund_processing_copy: z.string().trim().max(1000), instructions_email_intro: z.string().trim().max(500), notification_emails: z.array(z.email()).max(10) });
const updateSchema = z.object({ id: z.uuid(), status: z.enum(returnStatuses).nullable().optional(), note: z.string().trim().max(3000).nullable().optional(), inspection_details: z.string().trim().max(3000).nullable().optional(), approved_item_value_cents: z.number().int().min(0).nullable().optional(), refund_amount_cents: z.number().int().min(0).nullable().optional(), refund_transaction_reference: z.string().trim().max(150).nullable().optional() });

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = adminDb(); const id = new URL(request.url).searchParams.get("id");
  const { data: settings } = await db.from("return_settings").select("return_address,shipping_instructions,refund_processing_copy,instructions_email_intro,notification_emails,updated_at").eq("id", true).single();
  if (id) {
    if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid return ID" }, { status: 400 });
    const [{ data: record, error }, { data: events }] = await Promise.all([
      db.from("return_requests").select("*").eq("id", id).maybeSingle(),
      db.from("return_events").select("id,event_type,from_status,to_status,note,actor_id,created_at").eq("return_id", id).order("created_at"),
    ]);
    if (error || !record) return NextResponse.json({ error: "Return not found" }, { status: 404 });
    const photos = await Promise.all((record.photo_paths as string[]).map(async path => { const { data } = await db.storage.from("return-photos").createSignedUrl(path, 900); return { path, url: data?.signedUrl ?? null }; }));
    const { data: order } = record.order_id ? await db.from("orders").select("id,status,created_at,paid_at,total_cents,order_items(product_name,sku,size,quantity)").eq("id", record.order_id).maybeSingle() : { data: null };
    const preview = settings ? returnInstructionsEmail(record as ReturnMailRecord, settings) : null;
    const { data: emails } = await db.from("return_email_outbox").select("event_key,recipient,sent_at,attempt_count,last_error,created_at").eq("return_id", id).order("created_at");
    return NextResponse.json({ record, events: events ?? [], photos, order, settings, instructions_preview: preview, emails: emails ?? [], mail_enabled: returnMailEnabled() }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const { data, error } = await db.from("return_requests").select("id,reference,order_number,order_verified,customer_name,customer_email,items,status,submitted_at,updated_at").order("submitted_at", { ascending: false }).limit(500);
  return error ? NextResponse.json({ error: "Could not load returns" }, { status: 503 }) : NextResponse.json({ returns: data ?? [], settings, mail_enabled: returnMailEnabled() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check status, notes and refund details." }, { status: 400 });
  if (parsed.data.status === "refunded" && staff.role !== "admin") return NextResponse.json({ error: "Only administrators may record refunds." }, { status: 403 });
  const { error } = await adminDb().rpc("update_return_request", { p_id: parsed.data.id, p_actor: staff.user.id, p_status: parsed.data.status ?? null, p_note: parsed.data.note ?? null, p_inspection: parsed.data.inspection_details ?? null, p_approved_value: parsed.data.approved_item_value_cents ?? null, p_refund_amount: parsed.data.refund_amount_cents ?? null, p_refund_reference: parsed.data.refund_transaction_reference ?? null });
  if (error) return NextResponse.json({ error: error.message || "Could not update return" }, { status: 409 });
  if (parsed.data.status === "approved" || parsed.data.status === "refunded") {
    const { data: record } = await adminDb().from("return_requests").select("id,reference,order_number,customer_name,customer_email,items,submitted_at,requested_resolution,approved_item_value_cents,refund_amount_cents,refund_transaction_reference").eq("id", parsed.data.id).single();
    if (record) {
      try {
        const message = parsed.data.status === "approved" ? returnApprovalEmail({ ...record, items: record.items as ReturnItem[] }) : returnRefundEmail({ ...record, items: record.items as ReturnItem[] });
        await queueReturnEmail(`${record.id}:${parsed.data.status}`, record.id, record.customer_email, message);
      } catch { return NextResponse.json({ ok: true, warning: "Status saved, but the customer email could not be queued. Check the email log." }); }
    }
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Administrators only" }, { status: 403 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the return settings and notification addresses." }, { status: 400 });
  const { error } = await adminDb().from("return_settings").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", true);
  return error ? NextResponse.json({ error: "Could not save settings" }, { status: 503 }) : NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ id: z.uuid(), action: z.literal("send_instructions") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!returnMailEnabled()) return NextResponse.json({ error: "Return emails are disabled on this environment. Review the preview without sending." }, { status: 409 });
  const db = adminDb();
  const [{ data: record }, { data: settings }] = await Promise.all([db.from("return_requests").select("id,reference,order_number,customer_name,customer_email,items,submitted_at,status,requested_resolution").eq("id", parsed.data.id).maybeSingle(), db.from("return_settings").select("return_address,shipping_instructions,instructions_email_intro,refund_processing_copy").eq("id", true).single()]);
  if (!record || !settings || !settings.return_address.trim()) return NextResponse.json({ error: "Set the approved return address before sending instructions." }, { status: 409 });
  if (!["under_review", "awaiting_customer_return"].includes(record.status)) return NextResponse.json({ error: "Review the request before sending instructions." }, { status: 409 });
  const key = `${record.id}:instructions`;
  await queueReturnEmail(key, record.id, record.customer_email, returnInstructionsEmail({ ...record, items: record.items as ReturnItem[] }, settings));
  const { data: email } = await db.from("return_email_outbox").select("sent_at").eq("event_key", key).single();
  if (!email?.sent_at) return NextResponse.json({ error: "Instructions were queued but could not be delivered. Do not ask the customer to ship yet." }, { status: 503 });
  await db.rpc("update_return_request", { p_id: record.id, p_actor: staff.user.id, p_status: "awaiting_customer_return", p_note: "Return instructions emailed" });
  await db.from("return_events").insert({ return_id: record.id, actor_id: staff.user.id, event_type: "instructions", note: "Instructions emailed" });
  return NextResponse.json({ ok: true });
}
