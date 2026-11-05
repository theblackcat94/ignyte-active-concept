import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { readJoinFireSettings } from "@/lib/join-fire-settings";
import { joinFireWelcomeEmail } from "@/lib/email-templates";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const input = z.object({
  email: z.email().trim().toLowerCase().max(254), consent: z.literal(true), website: z.string().max(0),
  attribution: z.object({ source: z.string().regex(/^[a-zA-Z0-9_-]{0,40}$/), medium: z.string().regex(/^[a-zA-Z0-9_-]{0,40}$/), campaign: z.string().regex(/^[a-zA-Z0-9_-]{0,60}$/) }).optional(),
});
const attempts = new Map<string, number>();

export async function GET(request: Request) {
  const settings = await readJoinFireSettings();
  const staff = await verifiedStaff(request);
  const localPreview = process.env.NODE_ENV !== "production" && new URL(request.url).hostname === "127.0.0.1";
  if (!settings.publicEnabled && !staff && !localPreview) return NextResponse.json({ error: "This campaign is in private review." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ ...settings, preview: !settings.publicEnabled }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and agree to receive IGNYTE emails." }, { status: 400 });
  const settings = await readJoinFireSettings();
  if (!settings.publicEnabled || !settings.offerEnabled || process.env.JOIN_FIRE_ACTIVATION_APPROVED !== "true")
    return NextResponse.json({ error: "The welcome offer is not available yet." }, { status: 409 });
  if (!sesMailConfigured() || !process.env.NEXT_PUBLIC_SITE_URL) return NextResponse.json({ error: "Email signup is temporarily unavailable." }, { status: 503 });
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [key, time] of attempts) if (now - time > 60_000) attempts.delete(key);
  if (now - (attempts.get(address) ?? 0) < 15_000) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
  attempts.set(address, now);
  let issuedCode = "";
  try {
    const db = adminDb();
    const email = parsed.data.email;
    const { data: current, error: readError } = await db.from("marketing_subscribers").select("status").eq("email", email).maybeSingle();
    if (readError) throw readError;
    if (current?.status === "confirmed") return NextResponse.json({ ok: true, alreadySubscribed: true });
    if (current) return NextResponse.json({ error: "We already have your signup pending. Please contact support if your email has not arrived." }, { status: 409 });
    const { count, error: orderError } = await db.from("orders").select("id", { head: true, count: "exact" }).eq("customer_email", email).eq("status", "paid");
    if (orderError) throw orderError;
    if (count) return NextResponse.json({ error: "This welcome offer is for new customers. You can still join the regular newsletter on our website." }, { status: 409 });
    const code = `FIRE${randomBytes(6).toString("hex").toUpperCase()}`;
    issuedCode = code;
    const token = randomBytes(32).toString("hex");
    const attribution = parsed.data.attribution;
    const source = `join-fire:${code}${attribution ? `|${attribution.source}|${attribution.medium}|${attribution.campaign}` : ""}`;
    const { error: insertError } = await db.from("marketing_subscribers").insert({ email, status: "pending", consent_at: new Date().toISOString(), source, unsubscribe_token: token });
    if (insertError?.code === "23505") return NextResponse.json({ ok: true, alreadySubscribed: true });
    if (insertError) throw insertError;
    const { error: couponError } = await db.from("coupons").insert({ code, discount_type: "percent", discount_value: settings.offerPercent, min_subtotal_cents: 0, usage_limit: 1, starts_at: null, ends_at: null, active: true });
    if (couponError) throw couponError;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const unsubscribeUrl = `${siteUrl.replace(/\/$/, "")}/unsubscribe/?token=${token}`;
    await sendSesMail({ to: email, message: joinFireWelcomeEmail(siteUrl, unsubscribeUrl, code, settings.offerPercent, settings.offerTerms) });
    const { data: confirmed, error: confirmationError } = await db.from("marketing_subscribers").update({ status: "confirmed" }).eq("email", email).eq("unsubscribe_token", token).select("status").maybeSingle();
    if (confirmationError || !confirmed) { await db.from("coupons").update({ active: false }).eq("code", code); throw new Error("Confirmation could not be recorded"); }
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (error) {
    if (issuedCode) await adminDb().from("coupons").update({ active: false }).eq("code", issuedCode);
    console.error("JOIN THE FIRE signup failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We could not complete your signup. Please contact support before trying again." }, { status: 503 });
  }
}
