export const SUPPORT_LEVELS = ["Light", "Medium", "High"] as const;
export type SupportLevel = (typeof SUPPORT_LEVELS)[number];

export const supportGuidance: Record<SupportLevel, string> = {
  Light: "Yoga, Pilates, stretching and low-impact movement.",
  Medium: "Strength training, gym workouts and moderate-impact activities.",
  High: "Running, HIIT, boxing and high-impact movement.",
};

export function supportLevel(value: string | undefined): SupportLevel | null {
  const normalized = value?.trim().toLowerCase();
  return SUPPORT_LEVELS.find(level => level.toLowerCase() === normalized) ?? null;
}
