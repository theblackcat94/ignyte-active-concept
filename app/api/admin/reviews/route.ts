import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = adminDb();
  const { data, error } = await db.from("product_reviews").select("id,product_id,rating,fit_feedback,body,display_name,email,photo_path,verified_purchase,status,created_at,products(name,color,slug)")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load reviews" }, { status: 503 });
  const reviews = await Promise.all((data ?? []).map(async row => {
    const { data: signed } = row.photo_path ? await db.storage.from("review-photos").createSignedUrl(row.photo_path, 3600) : { data: null };
    return { ...row, photo_url: signed?.signedUrl ?? null };
  }));
  return NextResponse.json(reviews);
}
export async function PATCH(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { error } = await adminDb().from("product_reviews").update({ status: parsed.data.status, moderated_at: new Date().toISOString() }).eq("id", parsed.data.id);
  return error ? NextResponse.json({ error: "Could not update review" }, { status: 503 }) : NextResponse.json({ ok: true });
}
