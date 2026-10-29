import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { readPdpSocialSettings, refreshInstagramFeed } from "@/lib/pdp-social-settings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await readPdpSocialSettings();
  return NextResponse.json({ configured: Boolean(process.env.IGNYTE_INSTAGRAM_ACCESS_TOKEN), automatic: Boolean(settings.automatic), mediaCount: settings.cachedPosts?.length ?? 0, lastRefresh: settings.lastRefresh }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = process.env.IGNYTE_INSTAGRAM_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "A Meta Instagram access token has not been configured on the server." }, { status: 503 });
  try {
    const settings = await refreshInstagramFeed(true);
    return NextResponse.json({ configured: true, mediaCount: settings.cachedPosts?.length ?? 0, lastRefresh: settings.lastRefresh, automatic: Boolean(settings.automatic) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Meta media access could not be verified. Reconnect the professional account and check instagram_business_basic permission. The curated feed remains active." }, { status: 502 }); }
}
