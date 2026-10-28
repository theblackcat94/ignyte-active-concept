import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { pdpSocialSettingsSchema, readPdpSocialSettings, writePdpSocialSettings } from "@/lib/pdp-social-settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await readPdpSocialSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Could not load Instagram posts." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = pdpSocialSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check post details." }, { status: 400 });
  try { return NextResponse.json(await writePdpSocialSettings(parsed.data)); }
  catch { return NextResponse.json({ error: "Could not save Instagram posts." }, { status: 503 }); }
}
