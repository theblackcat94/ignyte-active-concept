import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { readJoinFireSettings } from "@/lib/join-fire-settings";
import { joinFireWelcomeEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const settings = await readJoinFireSettings();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";
    const message = joinFireWelcomeEmail(
      siteUrl, `${siteUrl.replace(/\/$/, "")}/unsubscribe/?token=PREVIEW-ONLY`,
      "FIRE-SAMPLE-CODE", settings.offerPercent, settings.offerTerms,
    );
    return NextResponse.json(message, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Email preview unavailable" }, { status: 503 });
  }
}
