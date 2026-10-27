import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, createHmac } from "node:crypto";
import { adminDb, verifiedUser } from "@/lib/commerce";

export const runtime = "nodejs";

const schema = z.object({
  requestId: z.string().uuid(),
  couponCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/).optional(),
  email: z.email().trim().toLowerCase().optional(),
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(20),
  shipping: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(30),
    line1: z.string().trim().min(3).max(150),
    line2: z.string().trim().max(150).default(""),
    city: z.string().trim().min(2).max(100),
    state: z.enum(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]),
    postal_code: z.string().regex(/^\d{4}$/),
    country: z.literal("AU"),
  }),
});

export async function POST(request: Request) {
  const user = await verifiedUser(request);
  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: "Order requests are not available yet." }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your bag and Australian delivery address." }, { status: 400 });
  const { items, shipping, requestId } = parsed.data;
  const email = user?.email ?? parsed.data.email;
  if (!email) return NextResponse.json({ error: "Enter an email address for your order." }, { status: 400 });
  const db = adminDb();
  const details = { name: shipping.name, phone: shipping.phone, address: {
    line1: shipping.line1, line2: shipping.line2, city: shipping.city,
    state: shipping.state, postal_code: shipping.postal_code, country: "AU",
  } };
  const mappedItems = items.map(item => ({ variant_id: item.variantId, quantity: item.quantity }));
  const guestToken = !user ? createHmac("sha256", process.env.SUPABASE_SECRET_KEY)
    .update(`${requestId}:${email}`).digest("hex") : null;
  const { data: orderId, error } = user
    ? await db.rpc("create_unpaid_order", {
      p_items: mappedItems, p_user_id: user.id, p_customer_email: email,
      p_shipping_details: details, p_client_request_id: requestId,
    })
    : await db.rpc("create_guest_unpaid_order", {
      p_items: mappedItems, p_customer_email: email, p_shipping_details: details,
      p_client_request_id: requestId,
      p_guest_token_hash: createHash("sha256").update(guestToken!).digest("hex"),
    });
  if (error || !orderId) {
    console.error("Order request failed", error?.message ?? "No order ID returned");
    return NextResponse.json({ error: "An item may be unavailable, or too many orders were placed recently. Please review your bag and try again." }, { status: 409 });
  }
  if (parsed.data.couponCode) {
    const { error: couponError } = await db.rpc("apply_coupon_to_order", { p_order_id: orderId, p_code: parsed.data.couponCode });
    if (couponError) {
      await db.rpc("release_order", { p_order_id: orderId });
      return NextResponse.json({ error: "That discount code is no longer available. Please review your order and try again." }, { status: 400 });
    }
  }
  const { data: order, error: orderError } = await db.from("orders").select("subtotal_cents,discount_cents").eq("id", orderId).single();
  if (orderError) console.error("Could not load order total", orderError.message);
  const { data: rate, error: rateError } = await db.from("shipping_rates").select("rate_cents,free_threshold_cents,active").eq("state", shipping.state).maybeSingle();
  if (rateError) console.error("Could not load shipping rate", rateError.message);
  let shippingCents: number | null = null;
  if (rate?.active && order) {
    const calculated = rate.free_threshold_cents != null && order.subtotal_cents >= rate.free_threshold_cents ? 0 : rate.rate_cents;
    const { error: totalError } = await db.from("orders").update({ shipping_cents: calculated,
      total_cents: order.subtotal_cents - order.discount_cents + calculated }).eq("id", orderId);
    shippingCents = calculated;
    if (totalError) { console.error("Could not save order total", totalError.message); shippingCents = null; }
  }
  await db.from("site_events").insert({ event_name: "order_requested", page_path: "/checkout/" });
  const response = NextResponse.json({ orderId, status: "awaiting_payment", guest: !user, shippingCents,
    amountDueCents: shippingCents === null || !order ? null : order.subtotal_cents - order.discount_cents + shippingCents });
  if (guestToken) response.cookies.set(`ignyte_guest_order_${orderId.replaceAll("-", "")}`, guestToken, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
