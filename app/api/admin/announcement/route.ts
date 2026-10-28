import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { announcementSettingsSchema, readAnnouncementSettings, writeAnnouncementSettings } from "@/lib/announcement-settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await readAnnouncementSettings(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Could not load announcement settings." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = announcementSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the message and link. Links must start with /." }, { status: 400 });
  try {
    await writeAnnouncementSettings(parsed.data);
    return NextResponse.json(parsed.data);
  } catch {
    return NextResponse.json({ error: "Could not save announcement settings." }, { status: 503 });
  }
}
