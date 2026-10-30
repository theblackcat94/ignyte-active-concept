import { NextResponse } from "next/server";
import { ewayConfigured } from "@/lib/eway";
import { paymentSiteMatchesEnvironment, selectedPaymentEnvironment, selectedPaymentProvider } from "@/lib/payment-provider";

export const runtime = "nodejs";

export function GET() {
  const provider = selectedPaymentProvider();
  const environment = selectedPaymentEnvironment();
  const available = provider === "manual" ? false
    : provider === "eway" ? ewayConfigured() && environment !== "none" && paymentSiteMatchesEnvironment(environment)
    : Boolean(process.env.STRIPE_SECRET_KEY && environment !== "none" && paymentSiteMatchesEnvironment(environment));
  return NextResponse.json({ provider: available ? provider : "manual", environment: available ? environment : "none", available },
    { headers: { "Cache-Control": "no-store" } });
}
