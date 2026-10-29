import { NextResponse } from "next/server";
import { ewayConfigured, ewayEnvironment } from "@/lib/eway";

export const runtime = "nodejs";

export function GET() {
  const environment = ewayEnvironment();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const expectedSite = environment === "sandbox" ? "https://dev.ignyteactive.com"
    : "https://ignyteactive.com";
  return NextResponse.json({ available: ewayConfigured() && site === expectedSite,
    environment: environment === "sandbox" ? "sandbox" : null },
  { headers: { "Cache-Control": "no-store" } });
}
