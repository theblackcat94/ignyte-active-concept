import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { blackFridayPreview, liveAnnouncement } from "@/data/announcement";

const announcementSchema = z.object({
  mode: z.enum(["static", "ticker"]),
  text: z.string().trim().min(1).max(160),
  action: z.string().trim().max(80),
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
    return announcementSettingsSchema.parse(JSON.parse(await readFile(configPath, "utf8")));
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
