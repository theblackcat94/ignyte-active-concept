import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";
import { eligibleForJoinFireCode, isJoinFireCode } from "@/lib/join-fire-offer";

export const runtime = "nodejs";
const input = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/), subtotalCents: z.number().int().min(0).max(100000000), email: z.email().trim().toLowerCase().optional() });

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid code" }, { status: 400 });
  if (isJoinFireCode(parsed.data.code)) {
    if (!parsed.data.email) return NextResponse.json({ error: "Enter your email address before applying this welcome offer." }, { status: 400 });
    try {
      if (!await eligibleForJoinFireCode(parsed.data.code, parsed.data.email)) return NextResponse.json({ error: "This welcome offer is not available for this email or order." }, { status: 400 });
    } catch { return NextResponse.json({ error: "Could not verify welcome offer eligibility." }, { status: 503 }); }
  }
  const { data, error } = await adminDb().from("coupons").select("code,discount_type,discount_value,min_subtotal_cents,usage_limit,starts_at,ends_at,active")
    .eq("code", parsed.data.code).maybeSingle();
  const now = Date.now();
  if (error || !data?.active || data.min_subtotal_cents > parsed.data.subtotalCents ||
      (data.starts_at && Date.parse(data.starts_at) > now) || (data.ends_at && Date.parse(data.ends_at) <= now)) {
    return NextResponse.json({ error: "Code unavailable for this order" }, { status: 400 });
  }
  if (data.usage_limit != null) {
    const { count } = await adminDb().from("orders").select("id", { count: "exact", head: true })
      .eq("coupon_code", data.code).in("status", ["awaiting_payment", "paid"]);
    if (count == null || count >= data.usage_limit) return NextResponse.json({ error: "Code unavailable for this order" }, { status: 400 });
  }
  const discountCents = data.discount_type === "percent"
    ? Math.floor(parsed.data.subtotalCents * data.discount_value / 100)
    : Math.min(parsed.data.subtotalCents, data.discount_value);
  return NextResponse.json({ code: data.code, discountCents, estimated: true });
}
