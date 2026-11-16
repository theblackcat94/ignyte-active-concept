// One launch switch controls every public entry point. Keep OFF until the
// commercial terms and 3PL exchange process have been approved.
export const firstFitPublic = process.env.NEXT_PUBLIC_FIRST_FIT_PROMISE_ENABLED === "true";
export const firstFitRequestsEnabled = firstFitPublic && process.env.FIRST_FIT_REQUESTS_ENABLED === "true";
// Show the programme name and review page on development without activating exchanges.
export const firstFitDevelopmentPreview = process.env.NEXT_PUBLIC_SITE_URL === "https://dev.ignyteactive.com";
export const firstFitReassuranceVisible = firstFitPublic || firstFitDevelopmentPreview;
// The legacy SQL function names and records stay intact. Translate messages from
// already-applied migrations before they reach a customer or staff member.
export function fitGuaranteeError(message: string) {
  return message.replace(/First Fit Promise/g, "IGNYTE Fit Guarantee").replace(/First Fit/g, "IGNYTE Fit Guarantee");
}
