import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { recoveryDeliverySummary, recoveryQueueSummary } from "@/lib/recovery-worker";
import { recoverySettings } from "@/lib/customer-recovery";
import { evaluateBrowse, type BrowseActivity } from "@/lib/browse-recovery";
import { displayColour } from "@/lib/display-colour";
import { browseRule } from "@/lib/browse-rules";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [settings, activity, delivery, previewResult] = await Promise.all([recoverySettings(), recoveryQueueSummary(), recoveryDeliverySummary(),
      adminDb().from("products").select("slug,name,color,image_path,product_variants(price_cents,sale_price_cents,stock_on_hand,active)").eq("status", "active").eq("slug", "aura-halter-aurora").maybeSingle()]);
    if (previewResult.error) throw previewResult.error;
    const sample = previewResult.data;
    const variant = sample?.product_variants?.find(row => row.active && row.stock_on_hand > 0);
    const previewProduct = sample && variant ? { slug: sample.slug, name: sample.name, color: displayColour(sample.color, sample.slug), image: sample.image_path, priceCents: variant.sale_price_cents ?? variant.price_cents } : null;
    return NextResponse.json({ settings, activity, delivery, previewProduct, deliveryLocked: process.env.RECOVERY_EMAIL_DELIVERY_ENABLED !== "true", browseCopyApproved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Recovery data is not available. The database migration may still be pending." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = z.object({ cart_enabled: z.boolean(), browse_enabled: z.boolean(), onsite_enabled: z.boolean(),
    browse_subject: z.string().trim().min(1).max(160), browse_preheader: z.string().trim().min(1).max(200), browse_delay_hours: z.number().int().min(1).max(168) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  const { data, error } = await adminDb().from("customer_recovery_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", true)
    .select("cart_enabled,browse_enabled,onsite_enabled,browse_subject,browse_preheader,browse_delay_hours").single();
  return error ? NextResponse.json({ error: "Settings could not be saved" }, { status: 503 }) : NextResponse.json({ settings: data });
}

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  // Explicit preview only. Customer sends are called by the separate secret-protected scheduler.
  const input = z.object({ action: z.enum(["dry_run", "fixture_test"]), asOf: z.string().datetime().optional() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  try {
    if (input.data.action === "fixture_test") {
      const now = input.data.asOf ? new Date(input.data.asOf).getTime() : Date.now();
      const base = { now, lastActiveAt: new Date(now - 24 * 3600_000).toISOString(), delayHours: 24,
        meaningful: true, consent: true, available: true, inBag: false, purchased: false,
        activeCart: false, sentWithinWeek: false, alreadySent: false };
      return NextResponse.json({ simulated: true, customerEmailsSent: 0, cases: [
        ["eligible", base], ["added_to_bag", { ...base, inBag: true }], ["purchased", { ...base, purchased: true }],
        ["unsubscribed", { ...base, consent: false }], ["frequency_limit", { ...base, sentWithinWeek: true }],
      ].map(([name, value]) => ({ name, decision: browseRule(value as typeof base) ?? "eligible" })) });
    }
    const [settings, activity] = await Promise.all([recoverySettings(), recoveryQueueSummary()]);
    const now = input.data.asOf ? new Date(input.data.asOf).getTime() : Date.now();
    if (Math.abs(now - Date.now()) > 7 * 86400_000) return NextResponse.json({ error: "Test clock must be within seven days" }, { status: 400 });
    const dueCart = activity.filter(item => item.kind === "cart" && !item.suppressed_at && now - new Date(item.last_active_at).getTime() >= (item.first_sent_at ? 24 : 3) * 3600_000 && !item.second_sent_at).length;
    const browseCandidates = await Promise.all(activity.filter(item => item.kind === "browse").map(async item => {
      try {
        const outcome = await evaluateBrowse(item as BrowseActivity, settings.browse_delay_hours, now);
        return { id: item.id, email: item.email, productSlug: item.product_slug, eligible: outcome.eligible, reason: outcome.eligible ? null : outcome.reason };
      } catch { return { id: item.id, email: item.email, productSlug: item.product_slug, eligible: false, reason: "evaluation_error" }; }
    }));
    return NextResponse.json({ dryRun: true, dueCart, dueBrowse: browseCandidates.filter(item => item.eligible).length, browseCandidates, settings, customerEmailsSent: 0, deliveryLocked: process.env.RECOVERY_EMAIL_DELIVERY_ENABLED !== "true" });
  } catch { return NextResponse.json({ error: "Dry run unavailable" }, { status: 503 }); }
}
