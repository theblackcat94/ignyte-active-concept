import { NextResponse } from "next/server";
import { readAnnouncementSettings } from "@/lib/announcement-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await readAnnouncementSettings();
    return NextResponse.json(settings, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Announcement settings could not be loaded." }, { status: 503 });
  }
}
