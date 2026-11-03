import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

const input = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(5000).default(""),
  cover_path: z.string().max(1000).nullable().default(null),
  cover_alt: z.string().max(200).default(""),
  focal_x: z.number().int().min(0).max(100).default(50),
  focal_y: z.number().int().min(0).max(100).default(50),
  seo_title: z.string().max(160).default(""),
  seo_description: z.string().max(320).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publish_at: z.string().datetime().nullable().default(null),
  mode: z.enum(["manual", "automatic"]).default("manual"),
  rules: z.object({ category: z.string().optional() }).default({}),
  product_ids: z.array(z.string().uuid()).max(100).default([]),
});

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = adminDb();
  const [{ data: collections, error }, { data: items, error: itemError }, { data: placement }] = await Promise.all([
    db.from("collections").select("*").order("created_at"),
    db.from("collection_products").select("collection_id,product_id,sort_order").order("sort_order"),
    db.from("collection_placements").select("placement,collection_id,max_products").eq("placement", "home-ignyte-edit").maybeSingle(),
  ]);
  if (error || itemError) return NextResponse.json({ error: error?.message || itemError?.message }, { status: 500 });
  return NextResponse.json({ collections: (collections ?? []).map(collection => ({ ...collection, product_ids: (items ?? []).filter(item => item.collection_id === collection.id).map(item => item.product_id) })), placement });
}

async function save(request: Request, update: boolean) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the collection fields and product selection." }, { status: 400 });
  const { product_ids, id, ...record } = parsed.data;
  if (update && !id) return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
  const db = adminDb();
  const oldSlug = update ? (await db.from("collections").select("slug").eq("id", id).single()).data?.slug as string | undefined : undefined;
  const { data, error } = update
    ? await db.from("collections").update({ ...record, updated_at: new Date().toISOString() }).eq("id", id).select("*").single()
    : await db.from("collections").insert(record).select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Could not save collection" }, { status: 400 });
  if (oldSlug && oldSlug !== data.slug) {
    const { error: redirectError } = await db.from("collection_redirects").upsert({ old_slug: oldSlug, destination: `/collections/${data.slug}/` });
    if (redirectError) return NextResponse.json({ error: `Collection renamed but the old URL could not be redirected: ${redirectError.message}` }, { status: 500 });
  }
  const { error: itemError } = await db.rpc("replace_collection_products", { p_collection_id: data.id, p_product_ids: product_ids });
  if (itemError) return NextResponse.json({ error: `Collection saved but products could not be updated: ${itemError.message}` }, { status: 500 });
  return NextResponse.json(data, { status: update ? 200 : 201 });
}

export const POST = (request: Request) => save(request, false);
export const PUT = (request: Request) => save(request, true);

export async function PATCH(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = z.object({ collection_id: z.string().uuid(), max_products: z.number().int().min(1).max(24).default(12) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select a collection." }, { status: 400 });
  const { error } = await adminDb().from("collection_placements").upsert({ placement: "home-ignyte-edit", ...parsed.data, updated_at: new Date().toISOString() });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
  const { error } = await adminDb().from("collections").delete().eq("id", parsed.data.id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
