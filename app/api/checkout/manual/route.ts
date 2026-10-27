import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedUser } from "@/lib/commerce";

export const runtime = "nodejs";

const schema = z.object({
  requestId: z.string().uuid(),
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
  if (!user?.email) return NextResponse.json({ error: "Sign in to place an order." }, { status: 401 });
  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: "Order requests are not available yet." }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check your bag and Australian delivery address." }, { status: 400 });
  const { items, shipping, requestId } = parsed.data;
  const db = adminDb();
  const { data: orderId, error } = await db.rpc("create_unpaid_order", {
    p_items: items.map(item => ({ variant_id: item.variantId, quantity: item.quantity })),
    p_user_id: user.id,
    p_customer_email: user.email,
    p_shipping_details: { name: shipping.name, phone: shipping.phone, address: {
      line1: shipping.line1, line2: shipping.line2, city: shipping.city,
      state: shipping.state, postal_code: shipping.postal_code, country: "AU",
    } },
    p_client_request_id: requestId,
  });
  if (error || !orderId) {
    console.error("Order request failed", error?.message ?? "No order ID returned");
    return NextResponse.json({ error: "An item may be unavailable, or too many orders were placed recently. Please review your bag and try again." }, { status: 409 });
  }
  return NextResponse.json({ orderId, status: "awaiting_payment" });
}
