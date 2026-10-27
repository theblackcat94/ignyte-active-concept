import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

const categoryInput = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(1).max(80),
  cover_path: z.string().trim().min(1).max(1000).refine(value =>
    value.startsWith("/images/") || value.startsWith("https://"), "Use a local image path or HTTPS URL"),
  sort_order: z.number().int().min(0).max(10000),
  active: z.boolean(),
});

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await adminDb().from("categories").select("*").order("sort_order").order("name");
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
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
  if (!changes.active) {
    const { count, error } = await db.from("products").select("id", { count: "exact", head: true })
      .eq("category", slug).eq("status", "active");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (count) return NextResponse.json({ error: "Archive or move active products before hiding this category." }, { status: 400 });
  }
  const { data, error } = await db.from("categories").update(changes).eq("slug", slug).select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
