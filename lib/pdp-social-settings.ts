import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { defaultPdpSocialSettings } from "@/data/pdp-social";

function approvedInstagramLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["instagram.com", "www.instagram.com"].includes(url.hostname) && /^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch { return false; }
}

function approvedImage(value: string) {
  if (/^\/images\/[a-zA-Z0-9/_ .-]+$/.test(value) && !value.includes("..")) return true;
  try {
    const url = new URL(value);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pyoskepqciqhnpgujtbs.supabase.co");
    return url.protocol === "https:" && url.origin === project.origin && url.pathname.startsWith("/storage/v1/object/public/home-media/");
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
  image: z.string().trim().max(500),
  video: z.string().trim().max(500).optional().refine(value => approvedVideo(value ?? ""), "Upload an MP4 to play a reel on the site."),
  embed: z.boolean().optional(),
  alt: z.string().trim().min(1).max(180),
  caption: z.string().trim().max(160),
  productSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(100),
}).refine(value => value.embed ? !value.image && !value.video : approvedImage(value.image), "Use a valid Instagram embed or upload a thumbnail.");

export const pdpSocialSettingsSchema = z.object({ enabled: z.boolean(), posts: z.array(postSchema).max(12) })
  .refine(value => new Set(value.posts.map(post => post.id)).size === value.posts.length, "Post IDs must be unique.");

const stateDir = process.env.IGNYTE_STATE_DIR ?? (process.env.NODE_ENV === "production" ? "/var/lib/ignyte" : path.join(process.cwd(), ".local-data"));
const configPath = path.join(stateDir, "pdp-social.json");

export async function readPdpSocialSettings() {
  try { return pdpSocialSettingsSchema.parse(JSON.parse(await readFile(configPath, "utf8"))); }
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
