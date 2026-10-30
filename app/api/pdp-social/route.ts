import { NextResponse } from "next/server";
import { readPdpSocialSettings } from "@/lib/pdp-social-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await readPdpSocialSettings();
    // The curated thumbnails and direct Instagram links are the published feed.
    // A Meta login/token is optional and must not gate the homepage carousel.
    return NextResponse.json({ posts: settings.enabled ? settings.posts.filter(post => post.enabled).slice(0, 10) : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load social posts." }, { status: 503 }); }
}
