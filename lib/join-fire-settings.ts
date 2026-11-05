import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const localImage = z.string().regex(/^\/images\/[a-zA-Z0-9/_ .-]+$/).refine(value => !value.includes(".."));
export const joinFireSettingsSchema = z.object({
  publicEnabled: z.boolean(),
  offerEnabled: z.boolean(),
  eyebrow: z.string().trim().min(1).max(80),
  headline: z.string().trim().min(1).max(120),
  introduction: z.string().trim().min(1).max(320),
  supportingCopy: z.string().trim().min(1).max(400),
  heroImage: localImage,
  cta: z.string().trim().min(1).max(80),
  offerPercent: z.number().int().min(1).max(50),
  offerTerms: z.string().trim().min(1).max(400),
  confirmationHeadline: z.string().trim().min(1).max(120),
  confirmationCopy: z.string().trim().min(1).max(240),
  emailCampaign: z.literal("join-fire-welcome"),
  seoTitle: z.string().trim().min(1).max(160),
  seoDescription: z.string().trim().min(1).max(320),
  socialImage: localImage,
});
export type JoinFireSettings = z.infer<typeof joinFireSettingsSchema>;

export const defaultJoinFireSettings: JoinFireSettings = {
  publicEnabled: false, offerEnabled: false,
  eyebrow: "JOIN THE FIRE_", headline: "YOUR FIRE STARTS HERE.",
  introduction: "Join the IGNYTE crew and get 10% off your first order.",
  supportingCopy: "Performance activewear built for women who bring the fire.",
  heroImage: "/images/about/About-bring-the-fire-3.jpg",
  cta: "UNLOCK MY 10% OFF ↗", offerPercent: 10,
  offerTerms: "First eligible order only. One use per new customer. Cannot be combined with another discount. Standard shipping and returns terms apply.",
  confirmationHeadline: "YOU'RE IN. LET'S IGNYTE! 🔥",
  confirmationCopy: "Welcome to the IGNYTE crew. Your welcome offer is on its way to your inbox.",
  emailCampaign: "join-fire-welcome",
  seoTitle: "Join the Fire | IGNYTE Active",
  seoDescription: "Join the IGNYTE crew and discover performance activewear made to move with you.",
  socialImage: "/images/about/About-bring-the-fire-3.jpg",
};

const stateDir = process.env.IGNYTE_STATE_DIR ?? (process.env.NODE_ENV === "production" ? "/var/lib/ignyte" : path.join(process.cwd(), ".local-data"));
const configPath = path.join(stateDir, "join-fire.json");

export async function readJoinFireSettings(): Promise<JoinFireSettings> {
  try { return joinFireSettingsSchema.parse(JSON.parse(await readFile(configPath, "utf8"))); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return defaultJoinFireSettings;
    throw error;
  }
}

export async function writeJoinFireSettings(value: unknown): Promise<JoinFireSettings> {
  const settings = joinFireSettingsSchema.parse(value);
  if ((settings.publicEnabled || settings.offerEnabled) && process.env.JOIN_FIRE_ACTIVATION_APPROVED !== "true")
    throw new Error("Campaign activation is locked until Marcus approves the offer and the server activation setting is enabled.");
  await mkdir(stateDir, { recursive: true, mode: 0o750 });
  const temporary = `${configPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o640 });
  await rename(temporary, configPath);
  return settings;
}
