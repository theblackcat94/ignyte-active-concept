import { NextResponse } from "next/server";
import { readHomeHeroSettings } from "@/lib/home-hero-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json(await readHomeHeroSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Could not load homepage slides." }, { status: 503 }); }
}
