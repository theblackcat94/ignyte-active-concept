import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/commerce";
import { parseMintsoftShippingEvent } from "@/lib/mintsoft-webhook";
import { queueMintsoftShippingEmail } from "@/lib/order-email-outbox";

export const runtime = "nodejs";

function authorised(request: Request, secret: string): boolean {
  const actual = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request, { params }: { params: Promise<{ event: string }> }) {
  const { event } = await params;
  if (event !== "dispatched" && event !== "delivered") {
    return NextResponse.json({ error: "Unknown shipping event" }, { status: 404 });
  }
  const secret = process.env.MINTSOFT_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  if (!authorised(request, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const body = await request.text();
  if (body.length > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(body); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = parseMintsoftShippingEvent(payload);
  if (!parsed) return NextResponse.json({ error: "Order reference missing or invalid" }, { status: 422 });
  const { data: changed, error } = await adminDb().rpc("apply_mintsoft_shipping_event", {
    p_order_id: parsed.orderId,
    p_event: event,
    p_carrier: parsed.carrier,
    p_tracking_number: parsed.trackingNumber,
    p_tracking_url: parsed.trackingUrl,
  });
  if (error) {
    console.error("Mintsoft shipping event rejected", error.code);
    return NextResponse.json({ error: "Shipping event could not be applied" }, { status: 409 });
  }
  // Queue on retries too: an earlier request may have saved the state but failed
  // before it could queue the email. The outbox event key prevents duplicates.
  try { await queueMintsoftShippingEmail(parsed.orderId, event); }
  catch (queueError) {
    console.error("Mintsoft shipping email could not be queued", queueError instanceof Error ? queueError.message : "Unknown error");
    return NextResponse.json({ error: "Shipping email could not be queued" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, changed });
}
