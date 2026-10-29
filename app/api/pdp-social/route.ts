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
    const automaticPosts = (settings.cachedPosts ?? []).map(post => {
      const code = post.href.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1];
      const override = settings.posts.find(item => code && item.href.includes(`/${code}/`));
      return override ? { ...post, enabled: override.enabled, image: override.embed === false && override.image ? override.image : post.image,
        caption: override.caption || post.caption, alt: override.alt || post.alt, cropX: override.cropX, cropY: override.cropY, productSlugs: override.productSlugs } : post;
    });
    const manualOnly = settings.posts.filter(post => post.embed !== true && !automaticPosts.some(item => item.href.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1] === post.href.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1]));
    const source = settings.automatic && automaticPosts.length ? [...manualOnly, ...automaticPosts] : settings.posts;
    return NextResponse.json({ posts: settings.enabled ? source.filter(post => post.enabled).slice(0, 10) : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Could not load social posts." }, { status: 503 }); }
}
