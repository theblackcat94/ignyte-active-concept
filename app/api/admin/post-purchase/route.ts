import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { postPurchaseOverview } from "@/lib/post-purchase-worker";
import { postPurchaseEmail, type JourneyStep } from "@/lib/post-purchase-email";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";

export const runtime = "nodejs";
const step = z.enum(["fit_care", "review_request", "complete_set"]);
const update = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("settings"), enabled: z.boolean() }),
  z.object({ kind: z.literal("step"), step, enabled: z.boolean(), delay_days: z.number().int().min(1).max(90), subject: z.string().trim().min(1).max(160), preheader: z.string().trim().min(1).max(200), body_copy: z.string().trim().min(1).max(6000) }),
]);
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), step }),
  z.object({ action: z.literal("test"), step }),
  z.object({ action: z.literal("suppress"), orderId: z.uuid() }),
]);

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json(await postPurchaseOverview(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Post-purchase schema is not installed yet" }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = update.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the journey settings" }, { status: 400 });
  const db = adminDb();
  if (parsed.data.kind === "settings") {
    const { error } = await db.from("post_purchase_settings").update({ enabled: parsed.data.enabled, updated_at: new Date().toISOString() }).eq("id", true);
    return error ? NextResponse.json({ error: "Could not save settings" }, { status: 503 }) : NextResponse.json({ ok: true });
  }
  const { kind: _kind, ...values } = parsed.data;
  void _kind;
  const { step: key, ...fields } = values;
  const { error } = await db.from("post_purchase_steps").update({ ...fields, updated_at: new Date().toISOString() }).eq("step", key);
  return error ? NextResponse.json({ error: "Could not save email settings" }, { status: 503 }) : NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = action.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (parsed.data.action === "suppress") {
    const { error } = await adminDb().from("post_purchase_jobs").update({ status: "suppressed", reason: "manual_admin_suppression", updated_at: new Date().toISOString() })
      .eq("order_id", parsed.data.orderId).eq("status", "scheduled");
    return error ? NextResponse.json({ error: "Could not suppress journey" }, { status: 503 }) : NextResponse.json({ ok: true });
  }
  const { data: config, error } = await adminDb().from("post_purchase_steps")
    .select("step,subject,preheader,body_copy").eq("step", parsed.data.step).single();
  if (error || !config) return NextResponse.json({ error: "Template unavailable" }, { status: 503 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl?.startsWith("https://")) return NextResponse.json({ error: "Site URL unavailable" }, { status: 503 });
  const sample = { name: "IGNYTE product", colour: "Aurora", size: "M", slug: "aura-halter-aurora", image: `${siteUrl.replace(/\/$/, "")}/images/about/About-bring-the-fire-3.jpg` };
  const recommendation = { name: "Matching IGNYTE piece", colour: "Aurora", slug: "seamless-short-aurora", image: sample.image, priceCents: 7000 };
  const design = postPurchaseEmail(config as { step: JourneyStep; subject: string; preheader: string; body_copy: string }, [sample], siteUrl, `${siteUrl.replace(/\/$/, "")}/unsubscribe/`, recommendation);
  if (parsed.data.action === "preview") return NextResponse.json({ design, sample: true }, { headers: { "Cache-Control": "no-store" } });
  if (!staff.user.email || !sesMailConfigured()) return NextResponse.json({ error: "Staff email or SES unavailable" }, { status: 503 });
  try { await sendSesMail({ to: staff.user.email, message: { ...design, subject: `[TEST] ${design.subject}` } }); return NextResponse.json({ sentTo: staff.user.email }); }
  catch { return NextResponse.json({ error: "Test email could not be sent" }, { status: 503 }); }
}
