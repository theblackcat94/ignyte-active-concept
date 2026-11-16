import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";
import { accessibleReturnOrder } from "@/lib/returns";
import { firstFitRequestsEnabled } from "@/lib/first-fit-promise";
import { firstFitReceivedEmail } from "@/lib/first-fit-emails";
import { queueReturnEmail } from "@/lib/return-outbox";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
const input = z.object({
  client_request_id: z.uuid(), order_id: z.uuid(), order_item_id: z.uuid(),
  email: z.email().trim().toLowerCase(), requested_size: z.string().trim().min(1).max(60),
  reason: z.string().trim().min(5).max(1000), comments: z.string().trim().max(3000).default(""),
});
function unavailable() { return NextResponse.json({ error: "The First Fit Promise is not accepting requests." }, { status: 409, headers: noStore }); }

export async function GET(request: NextRequest) {
  if (!firstFitRequestsEnabled) return unavailable();
  const query = new URL(request.url).searchParams;
  const order = await accessibleReturnOrder(request, query.get("order_id") || "");
  if (!order || order.customer_email.toLowerCase() !== (query.get("email") || "").trim().toLowerCase())
    return NextResponse.json({ error: "Sign in to the purchasing account or use the original checkout browser to verify this order." }, { status: 404, headers: noStore });
  const db = adminDb();
  const choices = await Promise.all(order.items.filter(item => item.variant_id && item.sale_at_purchase === false).map(async item => {
    const { data: source } = await db.from("product_variants").select("product_id").eq("id", item.variant_id!).maybeSingle();
    const { data: variants } = source ? await db.from("product_variants").select("id,size,stock_on_hand,active").eq("product_id", source.product_id).order("size") : { data: [] };
    return { item, sizes: (variants ?? []).filter(variant => variant.size.toLowerCase() !== item.size.toLowerCase()).map(variant => ({ size: variant.size, available: variant.active && variant.stock_on_hand > 0 })) };
  }));
  return NextResponse.json({ order: { id: order.id, customer_name: order.customer_name, delivered_at: order.delivered_at }, choices }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!firstFitRequestsEnabled) return unavailable();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the order, item and requested size." }, { status: 400, headers: noStore });
  const values = parsed.data;
  const order = await accessibleReturnOrder(request, values.order_id);
  if (!order || order.customer_email.toLowerCase() !== values.email || !order.items.some(item => item.id === values.order_item_id))
    return NextResponse.json({ error: "We couldn't verify that this order and item belong to you." }, { status: 403, headers: noStore });
  const db = adminDb();
  const { data: existing } = await db.from("return_requests").select("id,reference,customer_email").eq("client_request_id", values.client_request_id).maybeSingle();
  if (existing) return existing.customer_email.toLowerCase() === values.email
    ? NextResponse.json({ reference: existing.reference, duplicate: true }, { headers: noStore })
    : NextResponse.json({ error: "This request ID is already in use." }, { status: 409, headers: noStore });
  const { data, error } = await db.rpc("submit_first_fit_request", {
    p_client_request_id: values.client_request_id, p_order_id: values.order_id,
    p_order_item_id: values.order_item_id, p_requested_size: values.requested_size,
    p_reason: values.reason, p_comments: values.comments,
  });
  const created = Array.isArray(data) ? data[0] : null;
  if (error || !created) return NextResponse.json({ error: error?.message || "We couldn't record your request. Please try again." }, { status: 409, headers: noStore });
  const item = order.items.find(row => row.id === values.order_item_id)!;
  try {
    await queueReturnEmail(`${created.return_id}:first-fit:received`, created.return_id, values.email,
      firstFitReceivedEmail({ customer_name: order.customer_name, reference: created.return_reference,
        product_name: item.product_name, current_size: item.size, requested_size: values.requested_size }));
  } catch (cause) { console.error("First Fit receipt queue failed", cause instanceof Error ? cause.message : "Unknown error"); }
  return NextResponse.json({ reference: created.return_reference }, { status: 201, headers: noStore });
}
