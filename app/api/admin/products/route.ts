import { NextResponse } from "next/server";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { productInput } from "@/lib/admin-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await adminDb().from("products")
    .select("*,product_variants(*)").order("created_at", { ascending: false });
  return error ? NextResponse.json({ error: "Could not load products" }, { status: 500 }) : NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = productInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { variants, pdp_content, ...product } = parsed.data;
  if (product.status === "active" && !variants.some(variant => variant.active && variant.price_cents > 0)) {
    return NextResponse.json({ error: "An active product needs an active, priced variant." }, { status: 400 });
  }
  const db = adminDb();
  const { data, error } = await db.rpc("save_product", {
    p_product_id: null,
    p_product: product,
    p_variants: variants.map(({ sku, size, price_cents, sale_price_cents, stock_on_hand, active }) =>
      ({ sku, size, price_cents, sale_price_cents, stock_on_hand, active })),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { error: contentError } = await db.from("products").update({ pdp_content }).eq("id", data);
  return contentError ? NextResponse.json({ error: "Product created, but PDP content could not be saved. Apply the product content migration." }, { status: 500 })
    : NextResponse.json({ id: data }, { status: 201 });
}
