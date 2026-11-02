import { NextResponse } from "next/server";
import { adminDb, verifiedStaff } from "@/lib/commerce";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  const { data, error } = await adminDb().from("products").select("id").eq("slug", slug).maybeSingle();
  return error || !data ? NextResponse.json({ error: "Product not found" }, { status: 404 }) : NextResponse.json({ id: data.id });
}
