import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";
const rate = z.object({
  state: z.enum(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]),
  rate_cents: z.number().int().min(0),
  free_threshold_cents: z.number().int().min(0).nullable(),
  active: z.boolean(),
});

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await adminDb().from("shipping_rates").select("*").order("state");
  return error ? NextResponse.json({ error: "Could not load rates" }, { status: 503 }) : NextResponse.json(data);
}

export async function PUT(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = rate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the shipping rate" }, { status: 400 });
  const { error } = await adminDb().from("shipping_rates").upsert({ ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "state" });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
