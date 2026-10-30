import "server-only";

export type PaymentProvider = "eway" | "stripe" | "manual";
export type PaymentEnvironment = "sandbox" | "production" | "none";

export function selectedPaymentProvider(): PaymentProvider {
  const selected = process.env.PAYMENT_PROVIDER;
  if (selected === "eway" || selected === "stripe" || selected === "manual") return selected;
  // Preserve the existing eWAY setup until an operator explicitly selects another provider.
  return process.env.EWAY_ENVIRONMENT ? "eway" : "manual";
}

export function selectedPaymentEnvironment(): PaymentEnvironment {
  const provider = selectedPaymentProvider();
  if (provider === "manual") return "none";
  if (provider === "eway") return process.env.EWAY_ENVIRONMENT === "sandbox" ? "sandbox"
    : process.env.EWAY_ENVIRONMENT === "production" ? "production" : "none";
  const key = process.env.STRIPE_SECRET_KEY;
  return key?.startsWith("sk_test_") || key?.startsWith("rk_test_") ? "sandbox"
    : key?.startsWith("sk_live_") || key?.startsWith("rk_live_") ? "production" : "none";
}

export function paymentSiteMatchesEnvironment(environment: PaymentEnvironment) {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return environment === "sandbox" ? site === "https://dev.ignyteactive.com"
    : environment === "production" ? site === "https://ignyteactive.com" : false;
}
