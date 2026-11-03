import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

const categoryInput = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(1).max(80),
  cover_path: z.string().trim().max(1000).refine(value =>
    !value || value.startsWith("/images/") || value.startsWith("https://"), "Use a local image path or HTTPS URL"),
  cover_alt: z.string().trim().max(200).default(""),
  focal_x: z.number().int().min(0).max(100).default(50),
  focal_y: z.number().int().min(0).max(100).default(50),
  sort_order: z.number().int().min(0).max(10000),
  active: z.boolean(),
});

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = adminDb();
  const [{ data, error }, { data: products, error: productError }] = await Promise.all([
    db.from("categories").select("*").order("sort_order").order("name"),
    db.from("products").select("category"),
  ]);
  if (error || productError) return NextResponse.json({ error: error?.message || productError?.message }, { status: 500 });
  const counts = new Map<string, number>();
  for (const product of products ?? []) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  return NextResponse.json((data ?? []).map(category => ({ ...category, product_count: counts.get(category.slug) ?? 0 })));
}

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = categoryInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check category name, slug and cover." }, { status: 400 });
  const { data, error } = await adminDb().from("categories").insert(parsed.data).select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = categoryInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check category name, slug and cover." }, { status: 400 });
  const { slug, ...changes } = parsed.data;
  const db = adminDb();
  const { data, error } = await db.from("categories").update(changes).eq("slug", slug).select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = z.object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), action: z.enum(["hide", "publish", "archive", "restore", "delete"]), reassign_to: z.string().optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid category action." }, { status: 400 });
  const { data, error } = await adminDb().rpc("manage_category_lifecycle", { p_slug: parsed.data.slug, p_action: parsed.data.action, p_reassign_to: parsed.data.reassign_to ?? null });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ affected_products: data });
}
