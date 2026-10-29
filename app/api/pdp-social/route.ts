import { NextResponse } from "next/server";
import { readPdpSocialSettings, refreshInstagramFeed } from "@/lib/pdp-social-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await readPdpSocialSettings();
    if (settings.automatic && process.env.IGNYTE_INSTAGRAM_ACCESS_TOKEN) {
      try { settings = await refreshInstagramFeed(); } catch { /* Retain the last successful feed. */ }
    }
    const source = settings.automatic && settings.cachedPosts?.length ? settings.cachedPosts : settings.posts;
    return NextResponse.json({ posts: settings.enabled ? source.filter(post => post.enabled).slice(0, 10) : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load social posts." }, { status: 503 }); }
}
