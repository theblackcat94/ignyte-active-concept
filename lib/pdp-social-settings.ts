import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { defaultPdpSocialSettings, suppliedSocialCovers } from "@/data/pdp-social";
import { cacheInstagramCover } from "./instagram-cover-cache";
import { getInstagramAccessToken } from "./instagram-token-store";

function approvedInstagramLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["instagram.com", "www.instagram.com"].includes(url.hostname) && /^\/(?:[A-Za-z0-9._]+\/)?(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch { return false; }
}

function approvedImage(value: string) {
  if (/^\/images\/[a-zA-Z0-9/_ .-]+$/.test(value) && !value.includes("..")) return true;
  if (/^\/api\/instagram-cover\/\d{8,25}$/.test(value)) return true;
  try {
    const url = new URL(value);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pyoskepqciqhnpgujtbs.supabase.co");
    return url.protocol === "https:" && ((url.origin === project.origin && url.pathname.startsWith("/storage/v1/object/public/home-media/")) ||
      url.hostname === "cdninstagram.com" || url.hostname.endsWith(".cdninstagram.com") || url.hostname === "fbcdn.net" || url.hostname.endsWith(".fbcdn.net"));
  } catch { return false; }
}

function approvedVideo(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pyoskepqciqhnpgujtbs.supabase.co");
    return url.protocol === "https:" && url.origin === project.origin && url.pathname.startsWith("/storage/v1/object/public/home-media/") && url.pathname.endsWith(".mp4");
  } catch { return false; }
}

const postSchema = z.object({
  id: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
  href: z.string().trim().max(300).refine(approvedInstagramLink, "Use a direct Instagram post or reel URL."),
  image: z.string().trim().max(2000),
  video: z.string().trim().max(500).optional().refine(value => approvedVideo(value ?? ""), "Upload an MP4 to play a reel on the site."),
  embed: z.boolean().optional(),
  alt: z.string().trim().min(1).max(180),
  caption: z.string().trim().max(160),
  productSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(100),
  cropX: z.number().min(0).max(100).optional(),
  cropY: z.number().min(0).max(100).optional(),
}).refine(value => !value.image || approvedImage(value.image), "Upload a thumbnail or use a supplied brand cover.");

export const pdpSocialSettingsSchema = z.object({ enabled: z.boolean(), posts: z.array(postSchema).max(12), coversVersion: z.number().int().optional(), automatic: z.boolean().optional(), cachedPosts: z.array(postSchema).max(12).optional(), lastRefresh: z.iso.datetime().optional() })
  .refine(value => new Set(value.posts.map(post => post.id)).size === value.posts.length, "Post IDs must be unique.");

const stateDir = process.env.IGNYTE_STATE_DIR ?? (process.env.NODE_ENV === "production" ? "/var/lib/ignyte" : path.join(process.cwd(), ".local-data"));
const configPath = path.join(stateDir, "pdp-social.json");

export async function readPdpSocialSettings() {
  try {
    const settings = pdpSocialSettingsSchema.parse(JSON.parse(await readFile(configPath, "utf8")));
    // Upgrade only the original seed links; preserve any destination edited by the team.
    const upgraded = { ...settings, coversVersion: 1, posts: settings.posts.map(post => {
      const code = post.id.startsWith("instagram-") ? post.id.slice("instagram-".length) : "";
      const original = defaultPdpSocialSettings.posts.find(item => item.id === post.id);
      const href = original && post.href === `https://www.instagram.com/${original.href.includes("/reel/") ? "reel" : "p"}/${code}/` ? original.href : post.href;
      return { ...post, href, image: !settings.coversVersion && original ? suppliedSocialCovers[code] ?? post.image : post.image };
    }) };
    if (!settings.coversVersion) await writePdpSocialSettings(upgraded);
    return upgraded;
  }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return defaultPdpSocialSettings;
    throw error;
  }
}

export async function writePdpSocialSettings(value: unknown) {
  const settings = pdpSocialSettingsSchema.parse(value);
  await mkdir(stateDir, { recursive: true, mode: 0o750 });
  const temporary = `${configPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o640 });
  await rename(temporary, configPath);
  return settings;
}

let refreshPending: Promise<Awaited<ReturnType<typeof readPdpSocialSettings>>> | null = null;
export async function refreshInstagramFeed(force = false) {
  if (refreshPending) return refreshPending;
  refreshPending = (async () => {
    const settings = await readPdpSocialSettings();
    const token = await getInstagramAccessToken();
    if (!token) throw new Error("Meta Instagram access token is not configured");
    if (!force && settings.lastRefresh && Date.now() - Date.parse(settings.lastRefresh) < 60 * 60 * 1000) return settings;
    const url = new URL("https://graph.instagram.com/v25.0/me/media");
    url.searchParams.set("fields", "id,media_type,media_url,thumbnail_url,permalink,caption,timestamp");
    url.searchParams.set("limit", "12");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Meta media request failed");
    const result = await response.json() as { data?: { id: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string; caption?: string }[] };
    const candidates = await Promise.all((result.data ?? []).map(async item => {
      const code = item.permalink?.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1];
      const existing = settings.posts.find(post => code && post.href.includes(`/${code}/`));
      const sourceImage = item.thumbnail_url || item.media_url || "";
      const previous = settings.cachedPosts?.find(post => post.id === `meta-${item.id}`);
      let image = existing?.embed === false && existing.image ? existing.image : previous?.image || "";
      if (existing?.embed !== false && approvedImage(sourceImage)) {
        try { image = await cacheInstagramCover(item.id, sourceImage); } catch { /* Keep the last saved cover. */ }
      }
      const href = item.permalink || "";
      if (!/^https:\/\/(www\.)?instagram\.com\//.test(href) || !approvedImage(image)) return null;
      return { id: `meta-${item.id}`, enabled: existing?.enabled ?? true, href, image, alt: existing?.alt || "Ignyte Active Instagram post", caption: existing?.caption || (item.media_type === "VIDEO" ? "WATCH REEL" : "VIEW POST"), productSlugs: existing?.productSlugs ?? [], cropX: existing?.cropX, cropY: existing?.cropY };
    }));
    const posts = candidates.filter(post => post !== null).slice(0, 12);
    if (!posts.length) throw new Error("Meta returned no usable media");
    return writePdpSocialSettings({ ...settings, cachedPosts: posts, lastRefresh: new Date().toISOString() });
  })();
  try { return await refreshPending; } finally { refreshPending = null; }
}
