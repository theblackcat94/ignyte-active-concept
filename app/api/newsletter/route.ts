import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedUser } from "@/lib/commerce";
import { welcomeEmail } from "@/lib/email-templates";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";

export const runtime = "nodejs";

const schema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  consent: z.literal(true),
  website: z.string().max(0),
  source: z.enum(["footer", "checkout", "account"]).optional(),
  consentWordingVersion: z.literal("recovery-v1-2026-11-12").optional(),
});
const attempts = new Map<string, number>();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and agree to receive updates." }, { status: 400 });
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [key, time] of attempts) if (now - time > 60_000) attempts.delete(key);
  if (now - (attempts.get(address) ?? 0) < 15_000) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
  attempts.set(address, now);

  try {
    const db = adminDb();
    const user = parsed.data.consentWordingVersion ? await verifiedUser(request) : null;
    const verifiedRecoveryConsent = Boolean(user?.email && user.email.toLowerCase() === parsed.data.email && parsed.data.consentWordingVersion);
    const { data: current, error: readError } = await db.from("marketing_subscribers").select("status").eq("email", parsed.data.email).maybeSingle();
    if (readError) throw readError;
    if (current?.status === "confirmed") {
      if (verifiedRecoveryConsent) {
        const { error: consentError } = await db.from("marketing_subscribers").update({ consent_at: new Date().toISOString(), source: parsed.data.source ?? "footer", consent_wording_version: parsed.data.consentWordingVersion, recovery_consent_at: new Date().toISOString(), recovery_consent_source: parsed.data.source ?? "footer" }).eq("email", parsed.data.email);
        if (consentError) throw consentError;
      }
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl || !sesMailConfigured()) {
      return NextResponse.json({ error: "Email signup is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    const token = randomBytes(32).toString("hex");
    const record = {
      email: parsed.data.email,
      status: "pending",
      consent_at: new Date().toISOString(),
      source: parsed.data.source ?? "footer",
      consent_wording_version: parsed.data.consentWordingVersion ?? null,
      recovery_consent_at: verifiedRecoveryConsent ? new Date().toISOString() : null,
      recovery_consent_source: verifiedRecoveryConsent ? parsed.data.source ?? "footer" : null,
      unsubscribe_token: token,
    };
    const { error } = await db.from("marketing_subscribers").upsert(record, { onConflict: "email" });
    if (error) throw error;
    try {
      const unsubscribeUrl = `${siteUrl.replace(/\/$/, "")}/unsubscribe/?token=${token}`;
      await sendSesMail({ to: parsed.data.email, message: welcomeEmail(siteUrl, unsubscribeUrl) });
    } catch (mailError) {
      console.error("Newsletter welcome delivery failed", mailError instanceof Error ? mailError.message : "Unknown mail error");
      return NextResponse.json({ error: "Your details were saved, but we could not send the welcome email. Please try again shortly." }, { status: 503 });
    }
    const { data: confirmed, error: confirmationError } = await db.from("marketing_subscribers")
      .update({ status: "confirmed" }).eq("email", parsed.data.email).eq("unsubscribe_token", token)
      .select("status").maybeSingle();
    if (confirmationError || !confirmed) throw new Error("Newsletter confirmation could not be recorded");
    return NextResponse.json({ ok: true, emailSent: true });
  } catch {
    return NextResponse.json({ error: "Could not save your signup. Please try again." }, { status: 503 });
  }
}
