import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!url || !secret || !stripeKey) throw new Error("Supabase and Stripe server settings are required");

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const stripe = new Stripe(stripeKey);
const cutoff = new Date(Date.now() - 35 * 60 * 1000).toISOString();
const { data: orders, error } = await db.from("orders")
  .select("id,subtotal_cents,stripe_session_id").eq("status", "pending")
  .lt("created_at", cutoff).order("created_at").limit(100);
if (error) throw error;

for (const order of orders ?? []) {
  try {
    if (!order.stripe_session_id) {
      console.warn(`Pending order ${order.id} has no Stripe session; manual review required`);
      continue;
    }
    let session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if (session.status === "open" && session.expires_at < Date.now() / 1000) {
      session = await stripe.checkout.sessions.expire(session.id);
    }
    if (session.status === "expired") {
      const { error: releaseError } = await db.rpc("release_order", { p_order_id: order.id });
      if (releaseError) throw releaseError;
      console.info(`Released expired order ${order.id}`);
      continue;
    }
    const shipping = session.collected_information?.shipping_details;
    const shippingCents = session.total_details?.amount_shipping;
    if (session.status === "complete" && session.payment_status === "paid" &&
        session.currency === "aud" && session.amount_subtotal === order.subtotal_cents &&
        typeof shippingCents === "number" && typeof session.amount_total === "number" &&
        shipping?.address?.country === "AU") {
      const { error: completeError } = await db.rpc("complete_order", {
        p_order_id: order.id,
        p_session_id: session.id,
        p_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
        p_customer_email: session.customer_details?.email ?? null,
        p_shipping_cents: shippingCents,
        p_total_cents: session.amount_total,
        p_shipping_details: shipping,
      });
      if (completeError) throw completeError;
      console.info(`Completed paid order ${order.id}`);
    } else console.warn(`Order ${order.id} needs manual payment review`);
  } catch (failure) {
    console.error(`Could not reconcile order ${order.id}`, failure instanceof Error ? failure.message : "Unknown error");
    process.exitCode = 1;
  }
}
