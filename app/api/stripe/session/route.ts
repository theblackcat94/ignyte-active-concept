import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb, verifiedUser } from "@/lib/commerce";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !sessionId || sessionId.length > 255) return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
  let session: Stripe.Checkout.Session;
  try { session = await new Stripe(key).checkout.sessions.retrieve(sessionId); }
  catch { return NextResponse.json({ error: "Payment session not found." }, { status: 404 }); }
  const orderId = session.metadata?.order_id;
  if (!orderId) return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
  const db = adminDb();
  const { data: order, error } = await db.from("orders").select("id,user_id,status,stripe_session_id,guest_token_hash,guest_token_expires_at")
    .eq("id", orderId).maybeSingle();
  if (error || !order || order.stripe_session_id !== session.id) return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
  const user = await verifiedUser(request);
  if (order.user_id) {
    if (user?.id !== order.user_id) return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
  } else {
    const token = request.cookies.get(`ignyte_guest_order_${order.id.replaceAll("-", "")}`)?.value;
    const hash = token && /^[a-f0-9]{64}$/.test(token) ? createHash("sha256").update(token).digest("hex") : "";
    const expected = order.guest_token_hash;
    if (!expected || !hash || !timingSafeEqual(Buffer.from(hash), Buffer.from(expected)) ||
        !order.guest_token_expires_at || new Date(order.guest_token_expires_at) <= new Date()) {
      return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
    }
  }
  return NextResponse.json({ orderId: order.id, orderStatus: order.status, paymentStatus: session.payment_status,
    guest: !order.user_id }, { headers: { "Cache-Control": "no-store" } });
}
