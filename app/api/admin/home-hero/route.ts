import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { homeHeroSettingsSchema, readHomeHeroSettings, writeHomeHeroSettings } from "@/lib/home-hero-settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await readHomeHeroSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Could not load homepage slides." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = homeHeroSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check all slide fields." }, { status: 400 });
  try { return NextResponse.json(await writeHomeHeroSettings(parsed.data)); }
  catch { return NextResponse.json({ error: "Could not save homepage slides." }, { status: 503 }); }
}
