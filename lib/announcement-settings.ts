import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { blackFridayPreview, liveAnnouncement } from "@/data/announcement";
import { RETURNS_LABEL } from "@/lib/shipping-policy";

const outdatedReturnsClaim = /\bfree\s*(?:(?:,|&|and|easy|fast|30|day|days|[-–])\s*)*returns\b/i;
const safeReturnsCopy = (value: string) => value.replace(new RegExp(outdatedReturnsClaim.source, "gi"), RETURNS_LABEL).replace(/\b(?:easy\s+)?30[ -]day returns\b/gi, RETURNS_LABEL);

const announcementSchema = z.object({
  mode: z.enum(["static", "ticker"]),
  text: z.string().trim().min(1).max(160).refine(value => !outdatedReturnsClaim.test(value), "Free returns is no longer offered"),
  action: z.string().trim().max(80).refine(value => !outdatedReturnsClaim.test(value), "Free returns is no longer offered"),
  href: z.string().regex(/^\/(?!\/)[^\s]{0,200}$/, "Use a site path beginning with /"),
  theme: z.enum(["dark", "orange"]),
});

export const announcementSettingsSchema = z.object({
  enabled: z.boolean(),
  active: z.enum(["default", "blackFriday"]),
  default: announcementSchema,
  blackFriday: announcementSchema,
});
export type AnnouncementSettings = z.infer<typeof announcementSettingsSchema>;

export const defaultAnnouncementSettings: AnnouncementSettings = {
  enabled: true,
  active: "default",
  default: liveAnnouncement,
  blackFriday: blackFridayPreview,
};

const stateDir = process.env.IGNYTE_STATE_DIR ?? (process.env.NODE_ENV === "production" ? "/var/lib/ignyte" : path.join(process.cwd(), ".local-data"));
const configPath = path.join(stateDir, "announcement.json");

export async function readAnnouncementSettings(): Promise<AnnouncementSettings> {
  try {
    const raw = JSON.parse(await readFile(configPath, "utf8"));
    for (const key of ["default", "blackFriday"] as const) {
      if (raw[key] && typeof raw[key].text === "string") raw[key].text = safeReturnsCopy(raw[key].text);
      if (raw[key] && typeof raw[key].action === "string") raw[key].action = safeReturnsCopy(raw[key].action);
    }
    const stored = announcementSettingsSchema.parse(raw);
    // Migrate the previous everyday slogan while preserving any edited announcement.
    if (stored.default.text === "MOVE WITH PURPOSE. TRAIN WITH FIRE." && !stored.default.action) stored.default = liveAnnouncement;
    return stored;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return defaultAnnouncementSettings;
    throw error;
  }
}

export async function writeAnnouncementSettings(settings: AnnouncementSettings): Promise<void> {
  const validated = announcementSettingsSchema.parse(settings);
  await mkdir(stateDir, { recursive: true, mode: 0o750 });
  const temporary = `${configPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { mode: 0o640 });
  await rename(temporary, configPath);
}
