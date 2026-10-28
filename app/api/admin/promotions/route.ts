import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";
const coupon = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int().positive(),
  min_subtotal_cents: z.number().int().min(0),
  usage_limit: z.number().int().positive().nullable(),
  starts_at: z.iso.datetime().nullable(),
  ends_at: z.iso.datetime().nullable(),
  active: z.boolean(),
}).refine(item => item.discount_type !== "percent" || item.discount_value <= 100);

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await adminDb().from("coupons").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load coupons" }, { status: 503 });
  const usage = await Promise.all((data ?? []).map(async item => {
    const { count, error: countError } = await adminDb().from("orders")
      .select("id", { count: "exact", head: true })
      .eq("coupon_code", item.code).in("status", ["awaiting_payment", "paid"]);
    if (countError || count == null) throw Error("Could not load coupon usage");
    return { ...item, times_used: count, is_expired: Boolean(item.ends_at && new Date(item.ends_at).getTime() <= Date.now()) };
  })).catch(() => null);
  return usage ? NextResponse.json(usage) : NextResponse.json({ error: "Could not load coupon usage" }, { status: 503 });
}

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = coupon.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the coupon details" }, { status: 400 });
  const { error } = await adminDb().from("coupons").insert(parsed.data);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true }, { status: 201 });
}

export async function PUT(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = coupon.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the coupon details" }, { status: 400 });
  const { data, error } = await adminDb().from("coupons").update(parsed.data).eq("code", parsed.data.code).select("code");
  return error || !data?.length ? NextResponse.json({ error: error?.message ?? "Coupon not found" }, { status: 400 }) : NextResponse.json({ ok: true });
}
