import { adminDb } from "@/lib/commerce";
import { displayColour } from "@/lib/display-colour";
import { coversShoppingReminders } from "@/lib/marketing-consent";
import { browseRule } from "@/lib/browse-rules";

export type BrowseActivity = {
  id: string; email: string; kind: "browse"; product_slug: string | null;
  engagement: { activeSeconds?: number; interaction?: string; repeatVisit?: boolean };
  items?: { slug: string }[]; last_active_at: string; first_sent_at: string | null;
  suppressed_at: string | null;
};
type BrowseProduct = { name: string; color: string; image: string; slug: string; priceCents: number; priceFrom: boolean };
export type BrowseEvaluation = { eligible: true; product: BrowseProduct; unsubscribeToken: string } | { eligible: false; reason: string };
const day = 86_400_000;

/** Read-only eligibility check shared by the scheduler and admin dry run. */
export async function evaluateBrowse(activity: BrowseActivity, delayHours: number, now = Date.now()): Promise<BrowseEvaluation> {
  const db = adminDb();
  if (!activity.product_slug || activity.suppressed_at) return { eligible: false, reason: "suppressed_or_missing_product" };
  const meaningful = (activity.engagement?.activeSeconds ?? 0) >= 15 && Boolean(activity.engagement?.interaction);
  const early = browseRule({ now, lastActiveAt: activity.last_active_at, delayHours, meaningful, consent: true, available: true, inBag: false, purchased: false, activeCart: false, sentWithinWeek: false, alreadySent: !!activity.first_sent_at });
  if (early === "not_due" || early === "already_sent" || early === "insufficient_engagement") return { eligible: false, reason: early };

  const [subscriberResult, productResult, activityResult, orderResult] = await Promise.all([
    db.from("marketing_subscribers").select("status,unsubscribe_token,recovery_consent_at,consent_wording_version").eq("email", activity.email).maybeSingle(),
    db.from("products").select("id,slug,name,color,image_path,status,product_variants(id,price_cents,sale_price_cents,stock_on_hand,active)").eq("slug", activity.product_slug).maybeSingle(),
    db.from("customer_recovery_activity").select("id,kind,items,last_active_at,suppressed_at").eq("email", activity.email).limit(100),
    db.from("orders").select("id").eq("customer_email", activity.email).eq("status", "paid").gte("paid_at", activity.last_active_at).limit(100),
  ]);
  for (const result of [subscriberResult, productResult, activityResult, orderResult]) if (result.error) throw result.error;
  // A bounded query must never turn an incomplete history into an eligible send.
  if ((activityResult.data?.length ?? 0) >= 100 || (orderResult.data?.length ?? 0) >= 100)
    return { eligible: false, reason: "history_review_required" };
  const subscriber = subscriberResult.data;
  const product = productResult.data;
  const variants = product?.product_variants?.filter(variant => variant.active && variant.stock_on_hand > 0 && (variant.sale_price_cents ?? variant.price_cents) > 0) ?? [];
  const related = activityResult.data ?? [];
  const inBag = related.some(row => row.kind === "cart" && !row.suppressed_at && Array.isArray(row.items) && row.items.some((item: {slug: string}) => item.slug === activity.product_slug));
  const activeCart = related.some(row => row.kind === "cart" && !row.suppressed_at && now - new Date(row.last_active_at).getTime() < 7 * day);
  const orderIds = (orderResult.data ?? []).map(row => row.id);
  let purchased = false;
  if (orderIds.length) {
    const { data: lines, error } = await db.from("order_items").select("variant_id,product_name").in("order_id", orderIds).limit(200);
    if (error) throw error;
    if ((lines?.length ?? 0) >= 200) return { eligible: false, reason: "history_review_required" };
    const ids = new Set(product?.product_variants?.map(variant => variant.id) ?? []);
    purchased = (lines ?? []).some(line => ids.has(line.variant_id ?? "") || line.product_name?.trim().toLowerCase() === product?.name?.trim().toLowerCase());
  }
  const activityIds = related.map(row => row.id);
  let sentWithinWeek = false;
  if (activityIds.length) {
    const { count, error } = await db.from("customer_recovery_delivery").select("id", { count: "exact", head: true })
      .in("activity_id", activityIds).eq("stage", "browse_24h").eq("status", "sent")
      .gte("sent_at", new Date(now - 7 * day).toISOString());
    if (error) throw error;
    sentWithinWeek = Boolean(count);
  }
  const consent = subscriber?.status === "confirmed" && Boolean(subscriber.recovery_consent_at) && coversShoppingReminders(subscriber.consent_wording_version);
  const reason = browseRule({ now, lastActiveAt: activity.last_active_at, delayHours, meaningful, consent, available: product?.status === "active" && variants.length > 0,
    inBag, purchased, activeCart, sentWithinWeek, alreadySent: !!activity.first_sent_at });
  if (reason || !product || !subscriber?.unsubscribe_token) return { eligible: false, reason: reason ?? "no_active_consent" };
  const priceCents = Math.min(...variants.map(variant => variant.sale_price_cents ?? variant.price_cents));
  return { eligible: true, product: { name: product.name, color: displayColour(product.color, product.slug), image: product.image_path, slug: product.slug, priceCents,
    priceFrom: variants.some(variant => (variant.sale_price_cents ?? variant.price_cents) !== priceCents) }, unsubscribeToken: subscriber.unsubscribe_token };
}
