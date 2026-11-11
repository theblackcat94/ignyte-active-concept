import { createHash, randomBytes } from "node:crypto";
import { adminDb, verifiedUser } from "@/lib/commerce";

export const recoveryHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const newRecoveryToken = () => randomBytes(32).toString("hex");

export async function consentedRecoveryEmail(request: Request): Promise<string | null> {
  const user = await verifiedUser(request);
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;
  const { data, error } = await adminDb().from("marketing_subscribers")
    .select("status,recovery_consent_at,consent_wording_version").eq("email", email).maybeSingle();
  return !error && data?.status === "confirmed" && data.recovery_consent_at && data.consent_wording_version === "recovery-v1-2026-11-12" ? email : null;
}

export async function recoverySettings() {
  const { data, error } = await adminDb().from("customer_recovery_settings")
    .select("cart_enabled,browse_enabled,onsite_enabled").eq("id", true).single();
  if (error) throw error;
  return data;
}

export type RecoveryBagItem = { slug: string; size: string; quantity: number };

export async function availableRecoveryItems(items: RecoveryBagItem[]): Promise<RecoveryBagItem[]> {
  const slugs = [...new Set(items.map(item => item.slug))];
  if (!slugs.length) return [];
  const { data, error } = await adminDb().from("products")
    .select("slug,status,product_variants(size,stock_on_hand,active)").in("slug", slugs);
  if (error) throw error;
  return items.filter(item => {
    const product = data?.find(row => row.slug === item.slug && row.status === "active");
    return product?.product_variants?.some(variant => variant.active && variant.size === item.size && variant.stock_on_hand >= item.quantity);
  });
}

export async function purchasedSince(email: string, since: string): Promise<boolean> {
  const { count, error } = await adminDb().from("orders").select("id", { count: "exact", head: true })
    .eq("customer_email", email).eq("status", "paid").gte("paid_at", since);
  if (error) throw error;
  return Boolean(count);
}
