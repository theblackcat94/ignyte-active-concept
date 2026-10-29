import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedUser } from "@/lib/commerce";
import { createEwaySharedPage, ewayEnvironment } from "@/lib/eway";

export const runtime = "nodejs";

const input = z.object({ orderId: z.uuid() });

export async function POST(request: NextRequest) {
  const environment = ewayEnvironment();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!environment || siteUrl !== (environment === "sandbox"
    ? "https://dev.ignyteactive.com" : "https://ignyteactive.com")) {
    return NextResponse.json({ error: "Card payment is not configured here." }, { status: 503 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  const db = adminDb();
  const { data: order, error } = await db.from("orders").select(
    "id,user_id,customer_email,status,currency,total_cents,shipping_details,guest_token_hash,guest_token_expires_at,eway_access_code,eway_shared_payment_url"
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
  if (order.status !== "awaiting_payment" || order.currency !== "aud" ||
      !Number.isSafeInteger(order.total_cents) || order.total_cents <= 0) {
    return NextResponse.json({ error: "This order needs a confirmed shipping total before card payment." }, { status: 409 });
  }
  if (order.eway_access_code && order.eway_shared_payment_url) {
    return NextResponse.json({ url: order.eway_shared_payment_url }, { headers: { "Cache-Control": "no-store" } });
  }
  const details = order.shipping_details as { name?: string; phone?: string; address?: { country?: string } } | null;
  if (details?.address?.country !== "AU" || !details.name || !order.customer_email) {
    return NextResponse.json({ error: "Order delivery details are incomplete." }, { status: 409 });
  }
  const { error: prepareError } = await db.rpc("prepare_eway_order", { p_order_id: order.id });
  if (prepareError) {
    console.error("Eway order preparation failed", prepareError.message);
    return NextResponse.json({ error: "An item is unavailable or the order has changed. Contact support." }, { status: 409 });
  }
  try {
    const page = await createEwaySharedPage({
      orderId: order.id, totalCents: order.total_cents,
      customerEmail: order.customer_email, customerName: details.name,
      customerPhone: details.phone ?? "",
      redirectUrl: `${siteUrl}/checkout/eway-return/`,
      cancelUrl: `${siteUrl}/checkout/eway-return/?cancelled=1&order=${order.id}`,
    });
    const { data: attached, error: attachError } = await db.rpc("attach_eway_page", {
      p_order_id: order.id, p_access_code: page.accessCode, p_shared_url: page.url,
      p_environment: environment, p_expected_total_cents: order.total_cents,
    });
    if (attachError) throw attachError;
    if (!attached) {
      const { data: current } = await db.from("orders").select("eway_shared_payment_url")
        .eq("id", order.id).eq("status", "awaiting_payment").single();
      if (!current?.eway_shared_payment_url) throw new Error("Payment page race could not be resolved");
      return NextResponse.json({ url: current.eway_shared_payment_url }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ url: page.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (failure) {
    console.error("Eway payment page failed", failure instanceof Error ? failure.message : "Unknown error");
    return NextResponse.json({ error: "Payment could not be opened. Please try again or contact support." }, { status: 503 });
  }
}
