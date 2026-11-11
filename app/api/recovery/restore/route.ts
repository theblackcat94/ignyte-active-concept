import { NextResponse } from "next/server";
import { adminDb } from "@/lib/commerce";
import { availableRecoveryItems, recoveryHash, type RecoveryBagItem } from "@/lib/customer-recovery";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "This bag link is invalid." }, { status: 400 });
  try {
    const db = adminDb();
    const { data: delivery, error } = await db.from("customer_recovery_delivery")
      .select("status,restore_expires_at,customer_recovery_activity(email,items)")
      .eq("restore_hash", recoveryHash(token)).maybeSingle();
    if (error) throw error;
    if (!delivery || delivery.status !== "sent" || !delivery.restore_expires_at || new Date(delivery.restore_expires_at).getTime() <= Date.now())
      return NextResponse.json({ error: "This bag link has expired." }, { status: 410 });
    const activity = delivery.customer_recovery_activity as unknown as { email: string; items: RecoveryBagItem[] } | null;
    if (!activity) return NextResponse.json({ error: "This bag is unavailable." }, { status: 410 });
    const { data: subscriber } = await db.from("marketing_subscribers").select("status").eq("email", activity.email).maybeSingle();
    if (subscriber?.status !== "confirmed") return NextResponse.json({ error: "This bag is unavailable." }, { status: 410 });
    const items = await availableRecoveryItems(activity.items);
    return NextResponse.json({ items, unavailable: activity.items.length - items.length }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch { return NextResponse.json({ error: "This bag could not be restored right now." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const token = (await request.json().catch(() => null))?.token;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  try {
    const { error } = await adminDb().from("customer_recovery_delivery")
      .update({ restored_at: new Date().toISOString() })
      .eq("restore_hash", recoveryHash(token)).eq("status", "sent")
      .gt("restore_expires_at", new Date().toISOString());
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Could not record restore" }, { status: 503 }); }
}
