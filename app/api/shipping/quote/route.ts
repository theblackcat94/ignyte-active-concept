import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";
import { qualifiesForFreeShipping } from "@/lib/shipping-policy";

export const runtime = "nodejs";
const input = z.object({ state: z.enum(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]), subtotalCents: z.number().int().min(0).max(100000000) });

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an Australian state" }, { status: 400 });
  if (qualifiesForFreeShipping(parsed.data.subtotalCents)) return NextResponse.json({ configured: true, shippingCents: 0 });
  const { data, error } = await adminDb().from("shipping_rates").select("rate_cents,free_threshold_cents,active").eq("state", parsed.data.state).maybeSingle();
  if (error || !data?.active) return NextResponse.json({ configured: false, shippingCents: null });
  return NextResponse.json({ configured: true, shippingCents: data.rate_cents });
}
