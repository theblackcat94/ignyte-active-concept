import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { productInput } from "@/lib/admin-validation";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const parsed = productInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { variants, ...product } = parsed.data;
  if (product.status === "active" && !variants.some(variant => variant.active && variant.price_cents > 0)) {
    return NextResponse.json({ error: "An active product needs an active, priced variant." }, { status: 400 });
  }
  const db = adminDb();
  const { error } = await db.rpc("save_product", {
    p_product_id: id,
    p_product: product,
    p_variants: variants.map(({ id: variantId, sku, size, price_cents, sale_price_cents, stock_on_hand, stock_revision, active }) =>
      ({ id: variantId, sku, size, price_cents, sale_price_cents, stock_on_hand, stock_revision, active })),
  });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
