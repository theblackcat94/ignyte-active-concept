import { NextResponse } from "next/server";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await adminDb().from("orders")
    .select("id,status,customer_email,subtotal_cents,shipping_cents,total_cents,shipping_details,created_at,paid_at,order_items(product_name,sku,size,quantity,unit_price_cents)")
    .order("created_at", { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: "Could not load orders" }, { status: 500 }) : NextResponse.json(data);
}
