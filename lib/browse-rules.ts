export type Engagement = { activeSeconds?: number; interaction?: string; repeatVisit?: boolean };

/** Scores distinct PDP interactions without allowing passive page views to qualify. */
export function engagementScore(value: Engagement): number {
  return Math.min(3600, value?.activeSeconds ?? 0) + (value?.repeatVisit ? 120 : 0) +
    ({ size: 60, colour: 50, guide: 45, fit: 40, gallery: 25 }[value?.interaction ?? ""] ?? 0);
}

export function browseRule(input: {
  now: number; lastActiveAt: string; delayHours: number; meaningful: boolean;
  consent: boolean; available: boolean; inBag: boolean; purchased: boolean;
  activeCart: boolean; sentWithinWeek: boolean; alreadySent: boolean;
}): string | null {
  if (input.alreadySent) return "already_sent";
  if (!input.meaningful) return "insufficient_engagement";
  if (input.now - new Date(input.lastActiveAt).getTime() < input.delayHours * 3_600_000) return "not_due";
  if (!input.consent) return "no_active_consent";
  if (!input.available) return "unavailable";
  if (input.inBag) return "added_to_bag";
  if (input.purchased) return "purchased";
  if (input.activeCart) return "active_cart_recovery";
  if (input.sentWithinWeek) return "frequency_limit";
  return null;
}
