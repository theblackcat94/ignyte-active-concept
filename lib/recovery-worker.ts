import { adminDb } from "@/lib/commerce";
import { cartRecoveryEmail, type RecoveryEmailProduct } from "@/lib/email-templates";
import { availableRecoveryItems, newRecoveryToken, purchasedSince, recoveryHash, type RecoveryBagItem } from "@/lib/customer-recovery";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";
import { displayColour } from "@/lib/display-colour";

type Activity = { id: string; email: string; kind: "cart" | "browse"; items: RecoveryBagItem[]; product_slug: string | null; last_active_at: string; first_sent_at: string | null; second_sent_at: string | null; suppressed_at: string | null };
const hours = (value: number) => value * 3600_000;

export async function recoveryQueueSummary() {
  const db = adminDb();
  const { data, error } = await db.from("customer_recovery_activity")
    .select("id,email,kind,last_active_at,first_sent_at,second_sent_at,suppressed_at,suppression_reason")
    .order("last_active_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function recoveryDeliverySummary() {
  const { data, error } = await adminDb().from("customer_recovery_delivery")
    .select("id,stage,status,created_at,sent_at,restored_at,reason")
    .order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

/** Only called by the protected scheduler, with the environment lock explicitly enabled. */
export async function processRecoveryQueue(): Promise<{ sent: number; suppressed: number; skipped: number; failed: number }> {
  if (process.env.RECOVERY_EMAIL_DELIVERY_ENABLED !== "true") throw new Error("Recovery email delivery is locked off");
  if (!sesMailConfigured()) throw new Error("SES is not configured");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl?.startsWith("https://")) throw new Error("HTTPS site URL is required");
  const db = adminDb();
  const { error: retentionError } = await db.from("customer_recovery_activity")
    .delete().lt("created_at", new Date(Date.now() - 90 * 86400_000).toISOString());
  if (retentionError) throw retentionError;
  const { data: settings, error: settingsError } = await db.from("customer_recovery_settings")
    .select("cart_enabled,browse_enabled").eq("id", true).single();
  if (settingsError) throw settingsError;
  const result = { sent: 0, suppressed: 0, skipped: 0, failed: 0 };
  const { data, error } = await db.from("customer_recovery_activity")
    .select("id,email,kind,items,product_slug,last_active_at,first_sent_at,second_sent_at,suppressed_at")
    .eq("kind", "cart").is("suppressed_at", null).lt("last_active_at", new Date(Date.now() - hours(3)).toISOString())
    .order("last_active_at", { ascending: true }).limit(50);
  if (error) throw error;
  for (const activity of (data ?? []) as Activity[]) {
    if (activity.kind !== "cart" || !settings.cart_enabled) { result.skipped++; continue; }
    const elapsed = Date.now() - new Date(activity.last_active_at).getTime();
    const stage = !activity.first_sent_at && elapsed >= hours(3) ? "cart_3h" : activity.first_sent_at && !activity.second_sent_at && elapsed >= hours(24) ? "cart_24h" : null;
    if (!stage) { result.skipped++; continue; }
    try {
      const { data: subscriber, error: subscriberError } = await db.from("marketing_subscribers")
        .select("status,unsubscribe_token").eq("email", activity.email).maybeSingle();
      if (subscriberError) throw subscriberError;
      const items = await availableRecoveryItems(activity.items);
      const purchased = await purchasedSince(activity.email, activity.last_active_at);
      const reason = subscriber?.status !== "confirmed" ? "no_active_consent" : purchased ? "purchased" : items.length !== activity.items.length || !items.length ? "unavailable_or_empty" : null;
      if (reason) {
        const { error: suppressError } = await db.from("customer_recovery_activity").update({ suppressed_at: new Date().toISOString(), suppression_reason: reason }).eq("id", activity.id);
        if (suppressError) throw suppressError;
        result.suppressed++;
        continue;
      }
      const { data: claimed, error: claimError } = await db.from("customer_recovery_delivery")
        .insert({ activity_id: activity.id, stage, status: "claimed" }).select("id").maybeSingle();
      if (claimError || !claimed) { result.skipped++; continue; } // Unique stage claim prevents duplicate sends.
      const slugs = [...new Set(items.map(item => item.slug))];
      const { data: products, error: productError } = await db.from("products")
        .select("slug,name,color,image_path,product_variants(size,price_cents,sale_price_cents)").in("slug", slugs);
      if (productError) throw productError;
      const emailProducts: RecoveryEmailProduct[] = items.map(item => {
        const product = products?.find(row => row.slug === item.slug);
        if (!product) throw new Error("Recovery product disappeared");
        const variant = product.product_variants?.find(row => row.size === item.size);
        if (!variant) throw new Error("Recovery variant disappeared");
        return { name: product.name, color: displayColour(product.color, product.slug), image: product.image_path, slug: product.slug, size: item.size, quantity: item.quantity, priceCents: variant.sale_price_cents ?? variant.price_cents };
      });
      const rawToken = newRecoveryToken();
      const { error: tokenError } = await db.from("customer_recovery_delivery")
        .update({ restore_hash: recoveryHash(rawToken), restore_expires_at: new Date(Date.now() + 7 * 86400_000).toISOString() }).eq("id", claimed.id);
      if (tokenError) throw tokenError;
      const restoreUrl = `${siteUrl.replace(/\/$/, "")}/recover-bag/?token=${rawToken}`;
      const unsubscribeUrl = `${siteUrl.replace(/\/$/, "")}/unsubscribe/?token=${subscriber!.unsubscribe_token}`;
      await sendSesMail({ to: activity.email, message: cartRecoveryEmail(stage === "cart_3h" ? 1 : 2, emailProducts, restoreUrl, siteUrl, unsubscribeUrl) });
      const sentAt = new Date().toISOString();
      await db.from("customer_recovery_delivery").update({ status: "sent", sent_at: sentAt }).eq("id", claimed.id);
      await db.from("customer_recovery_activity").update(stage === "cart_3h" ? { first_sent_at: sentAt } : { second_sent_at: sentAt }).eq("id", activity.id);
      result.sent++;
    } catch (sendError) {
      console.error("Recovery send failed", sendError instanceof Error ? sendError.message : "Unknown error");
      await db.from("customer_recovery_delivery").update({ status: "failed", reason: "delivery_failed" }).eq("activity_id", activity.id).eq("stage", stage).eq("status", "claimed");
      result.failed++;
    }
  }
  return result;
}
