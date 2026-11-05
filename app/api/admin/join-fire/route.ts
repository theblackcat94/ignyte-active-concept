import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { readJoinFireSettings, writeJoinFireSettings } from "@/lib/join-fire-settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await readJoinFireSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Campaign settings unavailable" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const staff = await verifiedStaff(request);
  if (staff?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try { return NextResponse.json(await writeJoinFireSettings(await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save campaign" }, { status: 400 }); }
}
