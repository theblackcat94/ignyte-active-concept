import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/commerce";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !key || !signature) return NextResponse.json({ error: "Webhook unavailable" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = new Stripe(key).webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.expired") {
    return NextResponse.json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  if (!orderId) return NextResponse.json({ error: "Missing order reference" }, { status: 400 });
  const db = adminDb();
  const { data: order, error } = await db.from("orders").select("id,subtotal_cents,status,stripe_session_id")
    .eq("id", orderId).single();
  if (error || !order || (order.stripe_session_id && order.stripe_session_id !== session.id)) {
    return NextResponse.json({ error: "Unknown checkout session" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const shippingDetails = session.collected_information?.shipping_details;
    const shippingCents = session.total_details?.amount_shipping;
    if (session.payment_status !== "paid" || session.currency !== "aud" ||
        typeof session.amount_subtotal !== "number" || session.amount_subtotal !== order.subtotal_cents ||
        typeof shippingCents !== "number" || typeof session.amount_total !== "number" ||
        !shippingDetails || shippingDetails.address?.country !== "AU") {
      return NextResponse.json({ error: "Payment amount or status mismatch" }, { status: 400 });
    }
    const { error: completeError } = await db.rpc("complete_order", {
      p_order_id: orderId,
      p_session_id: session.id,
      p_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      p_customer_email: session.customer_details?.email ?? null,
      p_shipping_cents: shippingCents,
      p_total_cents: session.amount_total,
      p_shipping_details: shippingDetails,
    });
    if (completeError) return NextResponse.json({ error: "Order update failed" }, { status: 500 });
  } else {
    const { error: releaseError } = await db.rpc("release_order", { p_order_id: orderId });
    if (releaseError) return NextResponse.json({ error: "Stock release failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
