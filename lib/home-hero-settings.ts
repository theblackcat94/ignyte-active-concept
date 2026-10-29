import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { defaultHomeHeroSettings } from "@/data/home-hero";

function approvedMedia(src: string): boolean {
  if (!src) return true;
  if (/^\/images\/[a-zA-Z0-9/_ .-]+$/.test(src) && !src.includes("..")) return true;
  try {
    const url = new URL(src);
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pyoskepqciqhnpgujtbs.supabase.co");
    return url.protocol === "https:" && url.origin === project.origin && url.pathname.startsWith("/storage/v1/object/public/home-media/");
  } catch { return false; }
}

const mediaPath = z.string().trim().max(500).refine(approvedMedia, "Use a local image path or uploaded media URL.");
const slideSchema = z.object({
  id: z.string().trim().min(1).max(80), enabled: z.boolean(), kind: z.enum(["image", "video"]),
  desktopSrc: mediaPath.refine(Boolean, "Desktop media is required."), mobileSrc: mediaPath, poster: mediaPath,
  alt: z.string().trim().min(1).max(180), kicker: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(100), action: z.string().trim().min(1).max(80),
  href: z.string().regex(/^\/(?!\/)[^\s]{0,200}$/, "Use a site path beginning with /."),
});
export const homeHeroSettingsSchema = z.object({ slides: z.array(slideSchema).min(1).max(10) })
  .refine(value => value.slides.some(slide => slide.enabled), "Keep at least one slide visible.")
  .refine(value => new Set(value.slides.map(slide => slide.id)).size === value.slides.length, "Slide IDs must be unique.");

const stateDir = process.env.IGNYTE_STATE_DIR ?? (process.env.NODE_ENV === "production" ? "/var/lib/ignyte" : path.join(process.cwd(), ".local-data"));
const configPath = path.join(stateDir, "home-hero.json");

export async function readHomeHeroSettings() {
  try {
    const settings = homeHeroSettingsSchema.parse(JSON.parse(await readFile(configPath, "utf8")));
    // Move the previously shipped film to the new edit without replacing later admin choices.
    const oldFilms = new Set(["/images/home/Ignyte-Video-Website-Hero-Low-Res.mp4", "/images/home/Ignyte-Vertical-Trimmed-Compressed-Ultra.mp4"]);
    return { slides: settings.slides.map(slide => slide.id === "hero-film" ? {
      ...slide,
      desktopSrc: oldFilms.has(slide.desktopSrc) ? defaultHomeHeroSettings.slides[0].desktopSrc : slide.desktopSrc,
      mobileSrc: oldFilms.has(slide.mobileSrc) ? defaultHomeHeroSettings.slides[0].mobileSrc : slide.mobileSrc,
    } : slide) };
  }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return defaultHomeHeroSettings;
    throw error;
  }
}

export async function writeHomeHeroSettings(value: unknown) {
  const settings = homeHeroSettingsSchema.parse(value);
  await mkdir(stateDir, { recursive: true, mode: 0o750 });
  const temporary = `${configPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o640 });
  await rename(temporary, configPath);
  return settings;
}
