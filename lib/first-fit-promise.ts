// One launch switch controls every public entry point. Keep OFF until the
// commercial terms and 3PL exchange process have been approved.
export const firstFitPublic = process.env.NEXT_PUBLIC_FIRST_FIT_PROMISE_ENABLED === "true";
export const firstFitRequestsEnabled = firstFitPublic && process.env.FIRST_FIT_REQUESTS_ENABLED === "true";
