export const CHECKOUT_MARKETING_WORDING_VERSION = "checkout-journey-v1-2026-11-12";
export const RECOVERY_WORDING_VERSION = "recovery-v1-2026-11-12";

export function coversShoppingReminders(version: string | null | undefined): boolean {
  return version === RECOVERY_WORDING_VERSION || version === CHECKOUT_MARKETING_WORDING_VERSION;
}
