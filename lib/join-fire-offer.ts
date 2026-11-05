import "server-only";
import { adminDb } from "@/lib/commerce";
import { readJoinFireSettings } from "@/lib/join-fire-settings";

export const isJoinFireCode = (code: string) => /^FIRE[0-9A-F]{12}$/.test(code);

export async function eligibleForJoinFireCode(code: string, email: string): Promise<boolean> {
  if (!isJoinFireCode(code)) return true;
  const settings = await readJoinFireSettings();
  if (!settings.offerEnabled || !settings.publicEnabled || process.env.JOIN_FIRE_ACTIVATION_APPROVED !== "true") return false;
  const normalizedEmail = email.trim().toLowerCase();
  const db = adminDb();
  const [subscriber, previous] = await Promise.all([
    db.from("marketing_subscribers").select("status,source").eq("email", normalizedEmail).like("source", `join-fire:${code}%`).maybeSingle(),
    db.from("orders").select("id", { head: true, count: "exact" }).eq("customer_email", normalizedEmail).eq("status", "paid"),
  ]);
  if (subscriber.error || previous.error) throw new Error("Could not verify welcome offer eligibility");
  return subscriber.data?.status === "confirmed" && previous.count === 0;
}
