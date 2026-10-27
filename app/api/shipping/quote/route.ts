import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";

export const runtime = "nodejs";
const input = z.object({ state: z.enum(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]), subtotalCents: z.number().int().min(0).max(100000000) });

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an Australian state" }, { status: 400 });
  const { data, error } = await adminDb().from("shipping_rates").select("rate_cents,free_threshold_cents,active").eq("state", parsed.data.state).maybeSingle();
  if (error || !data?.active) return NextResponse.json({ configured: false, shippingCents: null });
  const shippingCents = data.free_threshold_cents != null && parsed.data.subtotalCents >= data.free_threshold_cents ? 0 : data.rate_cents;
  return NextResponse.json({ configured: true, shippingCents });
}
