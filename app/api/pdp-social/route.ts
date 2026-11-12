import { NextResponse } from "next/server";
import { readPdpSocialSettings, refreshInstagramFeed } from "@/lib/pdp-social-settings";
import { instagramConnected } from "@/lib/instagram-token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await readPdpSocialSettings();
    // Refresh stale connected feeds in the background of a request; retain the last
    // successful cache if Meta is temporarily unavailable.
    if (settings.automatic && await instagramConnected() && (!settings.lastRefresh || Date.now() - Date.parse(settings.lastRefresh) >= 60 * 60 * 1000)) {
      try { settings = await refreshInstagramFeed(); } catch { /* Serve the last good cache. */ }
    }
    const posts = settings.automatic && settings.cachedPosts?.length ? settings.cachedPosts : settings.posts;
    return NextResponse.json({ posts: settings.enabled ? posts.filter(post => post.enabled).slice(0, 10) : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load social posts." }, { status: 503 }); }
}
