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

async function applyIsolatedTestEvent(parsed: NonNullable<ReturnType<typeof parseMintsoftShippingEvent>>,
  event: "dispatched" | "delivered"): Promise<boolean> {
  const db = adminDb();
  const { data: order, error } = await db.from("orders")
    .select("status,shipping_status,shipping_details,stripe_session_id")
    .eq("id", parsed.orderId).maybeSingle();
  const details = order?.shipping_details as { test_order?: boolean } | null;
  if (error || !order || order.status !== "paid" || details?.test_order !== true ||
      !order.stripe_session_id?.startsWith("cs_test_")) {
    throw new Error("No eligible isolated Stripe test order");
  }
  if (order.shipping_status === "delivered" || order.shipping_status === event) return false;
  const values = {
    shipping_status: event,
    ...(parsed.carrier ? { carrier_name: parsed.carrier } : {}),
    ...(parsed.trackingNumber ? { tracking_number: parsed.trackingNumber } : {}),
    ...(parsed.trackingUrl ? { tracking_url: parsed.trackingUrl } : {}),
    ...(event === "dispatched" ? { dispatched_at: new Date().toISOString() }
      : { delivered_at: new Date().toISOString() }),
  };
  const { data: saved, error: saveError } = await db.from("orders").update(values)
    .eq("id", parsed.orderId).eq("status", "paid")
    .eq("shipping_status", order.shipping_status).select("id").maybeSingle();
  if (saveError || !saved) throw new Error("Isolated test event needs a retry");
  return true;
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
  let changed: boolean;
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL === "https://dev.ignyteactive.com") {
      changed = await applyIsolatedTestEvent(parsed, event);
    } else {
      const result = await adminDb().rpc("apply_mintsoft_shipping_event", {
        p_order_id: parsed.orderId,
        p_event: event,
        p_carrier: parsed.carrier,
        p_tracking_number: parsed.trackingNumber,
        p_tracking_url: parsed.trackingUrl,
      });
      if (result.error) throw result.error;
      changed = result.data;
    }
  } catch (error) {
    console.error("Mintsoft shipping event rejected", error instanceof Error ? error.message : "Unknown error");
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
