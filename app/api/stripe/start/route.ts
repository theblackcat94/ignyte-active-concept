import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { adminDb, verifiedUser } from "@/lib/commerce";
import { paymentSiteMatchesEnvironment, selectedPaymentEnvironment, selectedPaymentProvider } from "@/lib/payment-provider";

export const runtime = "nodejs";
const input = z.object({ orderId: z.uuid() });

export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const environment = selectedPaymentEnvironment();
  if (selectedPaymentProvider() !== "stripe" || !key || environment === "none" || !paymentSiteMatchesEnvironment(environment)) {
    return NextResponse.json({ error: "Stripe checkout is not enabled for this site." }, { status: 503 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });

  const db = adminDb();
  const { data: order, error } = await db.from("orders").select(
    "id,user_id,customer_email,status,currency,subtotal_cents,discount_cents,coupon_code,shipping_cents,total_cents,shipping_details,guest_token_hash,guest_token_expires_at,stripe_session_id"
  ).eq("id", parsed.data.orderId).maybeSingle();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const user = await verifiedUser(request);
  if (order.user_id) {
    if (user?.id !== order.user_id) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  } else {
    const token = request.cookies.get(`ignyte_guest_order_${order.id.replaceAll("-", "")}`)?.value;
    const hash = token && /^[a-f0-9]{64}$/.test(token) ? createHash("sha256").update(token).digest("hex") : "";
    const expected = order.guest_token_hash;
    if (!expected || !hash || !timingSafeEqual(Buffer.from(hash), Buffer.from(expected)) ||
        !order.guest_token_expires_at || new Date(order.guest_token_expires_at) <= new Date()) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
  }

  const expectedTotal = order.subtotal_cents - order.discount_cents + (order.shipping_cents ?? -1);
  const shippingDetails = order.shipping_details as { name?: string; phone?: string; address?: { country?: string }; test_order?: boolean } | null;
  if (order.status !== "awaiting_payment" || order.currency !== "aud" || !order.customer_email ||
      !shippingDetails?.name || shippingDetails.address?.country !== "AU" ||
      !Number.isSafeInteger(order.shipping_cents) || order.shipping_cents < 0 ||
      !Number.isSafeInteger(order.total_cents) || order.total_cents !== expectedTotal || expectedTotal <= 0) {
    return NextResponse.json({ error: "This order needs a confirmed Australian delivery total before payment." }, { status: 409 });
  }

  const stripe = new Stripe(key);
  if (order.stripe_session_id) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (existing.status === "open" && existing.url) {
        return NextResponse.json({ url: existing.url }, { headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ error: "This payment session has already completed or expired. Please contact support to restart payment." }, { status: 409 });
    } catch {
      return NextResponse.json({ error: "The existing payment session could not be verified. Please contact support." }, { status: 503 });
    }
  }

  const { data: items, error: itemError } = await db.from("order_items")
    .select("product_name,sku,size,quantity,unit_price_cents").eq("order_id", order.id);
  if (itemError || !items?.length || items.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0) !== order.subtotal_cents) {
    return NextResponse.json({ error: "The order items could not be verified." }, { status: 409 });
  }

  const { error: reserveError } = await db.rpc("prepare_stripe_order", { p_order_id: order.id });
  if (reserveError) {
    console.error("Stripe order reservation failed", reserveError.message);
    return NextResponse.json({ error: "An item is unavailable or the order has changed. Please review your bag." }, { status: 409 });
  }

  try {
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (order.discount_cents > 0) {
      const coupon = await stripe.coupons.create({ amount_off: order.discount_cents, currency: "aud", duration: "once",
        name: order.coupon_code ? `Ignyte ${order.coupon_code}` : `Ignyte order ${order.id.slice(0, 8)}` },
      { idempotencyKey: `ignyte-coupon-${order.id}` });
      discounts.push({ coupon: coupon.id });
    }
    if (environment === "sandbox" && !shippingDetails.test_order) {
      const { error: markError } = await db.from("orders").update({ shipping_details: { ...shippingDetails, test_order: true } })
        .eq("id", order.id).eq("status", "awaiting_payment");
      if (markError) throw new Error("Could not mark test order");
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.customer_email,
      client_reference_id: order.id,
      metadata: { order_id: order.id, payment_environment: environment },
      payment_intent_data: { metadata: { order_id: order.id, payment_environment: environment } },
      line_items: items.map(item => ({
        quantity: item.quantity,
        price_data: { currency: "aud", unit_amount: item.unit_price_cents,
          product_data: { name: `${item.product_name} / ${item.size}`, metadata: { sku: item.sku } } },
      })),
      ...(discounts.length ? { discounts } : {}),
      shipping_address_collection: { allowed_countries: ["AU"] },
      shipping_options: [{ shipping_rate_data: {
        type: "fixed_amount", display_name: order.shipping_cents === 0 ? "Free Australian delivery" : "Standard Australian delivery",
        fixed_amount: { amount: order.shipping_cents, currency: "aud" },
      } }],
      success_url: `${siteUrl}/checkout/stripe-success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/?payment=cancelled&order_id=${order.id}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    }, { idempotencyKey: `ignyte-session-${order.id}` });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    const { error: linkError } = await db.from("orders").update({ stripe_session_id: session.id })
      .eq("id", order.id).eq("status", "awaiting_payment").is("stripe_session_id", null);
    if (linkError) {
      try { await stripe.checkout.sessions.expire(session.id); } catch { /* webhook will reconcile this session */ }
      throw new Error("Could not link checkout session");
    }
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (failure) {
    console.error("Stripe checkout session creation failed", failure instanceof Error ? failure.message : "Unknown error");
    return NextResponse.json({ error: "Payment could not be opened. Please try again or contact support." }, { status: 503 });
  }
}
