import { NextResponse } from "next/server";
import { readPdpSocialSettings } from "@/lib/pdp-social-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await readPdpSocialSettings();
    return NextResponse.json({ posts: settings.enabled ? settings.posts.filter(post => post.enabled) : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load social posts." }, { status: 503 }); }
}
