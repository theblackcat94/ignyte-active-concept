import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { readPdpSocialSettings, refreshInstagramFeed } from "@/lib/pdp-social-settings";
import { instagramConnected, instagramOAuthReady } from "@/lib/instagram-token-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await readPdpSocialSettings();
  return NextResponse.json({ configured: await instagramConnected(), oauthReady: instagramOAuthReady(), automatic: Boolean(settings.automatic), mediaCount: settings.cachedPosts?.length ?? 0, lastRefresh: settings.lastRefresh }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!await instagramConnected()) return NextResponse.json({ error: "Connect the Instagram professional account before testing the feed." }, { status: 503 });
  try {
    const settings = await refreshInstagramFeed(true);
    return NextResponse.json({ configured: true, mediaCount: settings.cachedPosts?.length ?? 0, lastRefresh: settings.lastRefresh, automatic: Boolean(settings.automatic) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Meta media access could not be verified. Reconnect the professional account and check instagram_business_basic permission. The curated feed remains active." }, { status: 502 }); }
}
