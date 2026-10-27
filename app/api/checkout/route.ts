import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { adminDb, verifiedUser } from "@/lib/commerce";

export const runtime = "nodejs";

const bagSchema = z.object({ items: z.array(z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
})).min(1).max(20) });

export async function POST(request: Request) {
  const user = await verifiedUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to check out." }, { status: 401 });
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const shippingRate = process.env.STRIPE_SHIPPING_RATE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!stripeKey || !shippingRate || !siteUrl) {
    return NextResponse.json({ error: "Checkout is not configured yet." }, { status: 503 });
  }
  const parsed = bagSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid bag." }, { status: 400 });

  const db = adminDb();
  const { data: orderId, error: reserveError } = await db.rpc("reserve_order", {
    p_items: parsed.data.items.map(item => ({ variant_id: item.variantId, quantity: item.quantity })),
    p_user_id: user.id,
  });
  if (reserveError || !orderId) {
    return NextResponse.json({ error: "An item is unavailable. Please refresh your bag." }, { status: 409 });
  }

  let createdSession: Stripe.Checkout.Session | null = null;
  try {
    const { data: items, error: itemsError } = await db.from("order_items")
      .select("product_name,sku,size,quantity,unit_price_cents").eq("order_id", orderId);
    if (itemsError || !items?.length) throw new Error("Reserved order items could not be read");
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: orderId,
      metadata: { order_id: orderId },
      allowed_payment_method_types: ["card"],
      line_items: items.map(item => ({
        quantity: item.quantity,
        price_data: {
          currency: "aud",
          unit_amount: item.unit_price_cents,
          product_data: { name: `${item.product_name} / ${item.size}`, metadata: { sku: item.sku } },
        },
      })),
      shipping_address_collection: { allowed_countries: ["AU"] },
      shipping_options: [{ shipping_rate: shippingRate }],
      success_url: `${siteUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    }, { idempotencyKey: orderId });
    createdSession = session;
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    const { error: linkError } = await db.from("orders").update({ stripe_session_id: session.id })
      .eq("id", orderId).eq("status", "pending");
    if (linkError) throw linkError;
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (createdSession) {
      try { await new Stripe(stripeKey).checkout.sessions.expire(createdSession.id); }
      catch (expireError) {
        console.error("Checkout session could not be expired; stock remains reserved", expireError instanceof Error ? expireError.message : "Unknown error");
        return NextResponse.json({ error: "Checkout could not be started. Please contact support." }, { status: 503 });
      }
    }
    await db.rpc("release_order", { p_order_id: orderId });
    console.error("Checkout session creation failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Checkout could not be started. Please try again." }, { status: 503 });
  }
}
