import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";
import { availableRecoveryItems, consentedRecoveryEmail, recoverySettings } from "@/lib/customer-recovery";
import { engagementScore } from "@/lib/browse-rules";

export const runtime = "nodejs";
const bagItem = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,100}$/), size: z.string().min(1).max(30), quantity: z.number().int().min(1).max(20) });
const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cart"), items: z.array(bagItem).max(20) }),
  z.object({ kind: z.literal("browse"), productSlug: z.string().regex(/^[a-z0-9-]{1,100}$/), engagement: z.object({ activeSeconds: z.number().int().min(15).max(3600), interaction: z.enum(["gallery", "size", "colour", "guide", "fit"]), repeatVisit: z.boolean().optional() }) }),
]);

export async function GET() {
  try {
    const settings = await recoverySettings();
    return NextResponse.json({ onsiteEnabled: settings.onsite_enabled && settings.browse_enabled }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ onsiteEnabled: false }, { headers: { "Cache-Control": "no-store" } }); }
}

export async function POST(request: Request) {
  const email = await consentedRecoveryEmail(request);
  if (!email) return NextResponse.json({ captured: false }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid activity." }, { status: 400 });
  try {
    const db = adminDb();
    const settings = await recoverySettings();
    const { error: retentionError } = await db.from("customer_recovery_activity")
      .delete().lt("created_at", new Date(Date.now() - 90 * 86400_000).toISOString());
    if (retentionError) throw retentionError;
    const entry = parsed.data;
    if (!(entry.kind === "cart" ? settings.cart_enabled || settings.browse_enabled : settings.browse_enabled)) return NextResponse.json({ captured: false });
    const { data: recent, error: recentError } = await db.from("customer_recovery_activity")
      .select("id,kind,last_active_at,first_sent_at,second_sent_at,created_at,product_slug,engagement,suppressed_at")
      .eq("email", email).order("created_at", { ascending: false }).limit(10);
    if (recentError) throw recentError;
    const latest = recent?.find(row => row.kind === entry.kind && !row.suppressed_at);
    const now = Date.now();
    const withinWeek = latest && now - new Date(latest.created_at).getTime() < 7 * 86400_000;
    if (entry.kind === "browse" && recent?.some(row => row.kind === "cart" && now - new Date(row.last_active_at).getTime() < 7 * 86400_000)) return NextResponse.json({ captured: false });
    if (withinWeek && (latest.second_sent_at || (entry.kind === "browse" && latest.first_sent_at))) return NextResponse.json({ captured: false });
    if (!withinWeek && latest) {
      const { error: closeError } = await db.from("customer_recovery_activity")
        .update({ suppressed_at: new Date().toISOString(), suppression_reason: "cycle_expired" }).eq("id", latest.id);
      if (closeError) throw closeError;
    }
    if (entry.kind === "cart") {
      const items = await availableRecoveryItems(entry.items);
      const browses = (recent ?? []).filter(row => row.kind === "browse" && !row.suppressed_at && items.some(item => item.slug === row.product_slug));
      for (const browse of browses) {
        const { error: suppressError } = await db.from("customer_recovery_activity").update({ suppressed_at: new Date().toISOString(), suppression_reason: "added_to_bag" }).eq("id", browse.id);
        if (suppressError) throw suppressError;
      }
      if (!settings.cart_enabled) return NextResponse.json({ captured: false });
      if (!items.length) {
        if (latest) await db.from("customer_recovery_activity").update({ suppressed_at: new Date().toISOString(), suppression_reason: "empty_or_unavailable" }).eq("id", latest.id);
        return NextResponse.json({ captured: false });
      }
      const values = { items, last_active_at: new Date().toISOString(), suppressed_at: null, suppression_reason: null };
      const result = withinWeek ? await db.from("customer_recovery_activity").update(values).eq("id", latest.id)
        : await db.from("customer_recovery_activity").insert({ email, kind: "cart", ...values });
      if (result.error) throw result.error;
    } else {
      const { data: product, error } = await db.from("products").select("slug").eq("slug", entry.productSlug).eq("status", "active").maybeSingle();
      if (error || !product) return NextResponse.json({ captured: false });
      // Keep the strongest product in this cycle; weaker visits must not reset its 24-hour clock.
      if (withinWeek && latest && engagementScore(latest.engagement ?? {}) > engagementScore(entry.engagement)) return NextResponse.json({ captured: true });
      const values = { product_slug: entry.productSlug, engagement: entry.engagement, last_active_at: new Date().toISOString() };
      const result = withinWeek ? await db.from("customer_recovery_activity").update(values).eq("id", latest.id)
        : await db.from("customer_recovery_activity").insert({ email, kind: "browse", ...values });
      if (result.error) throw result.error;
    }
    return NextResponse.json({ captured: true });
  } catch (error) {
    console.error("Recovery capture failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Activity could not be saved." }, { status: 503 });
  }
}
