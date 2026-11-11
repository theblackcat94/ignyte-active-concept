import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { recoveryDeliverySummary, recoveryQueueSummary } from "@/lib/recovery-worker";
import { recoverySettings } from "@/lib/customer-recovery";

export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [settings, activity, delivery] = await Promise.all([recoverySettings(), recoveryQueueSummary(), recoveryDeliverySummary()]);
    return NextResponse.json({ settings, activity, delivery, deliveryLocked: process.env.RECOVERY_EMAIL_DELIVERY_ENABLED !== "true", browseCopyApproved: false }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Recovery data is not available. The database migration may still be pending." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const parsed = z.object({ cart_enabled: z.boolean(), browse_enabled: z.boolean(), onsite_enabled: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  const { data, error } = await adminDb().from("customer_recovery_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", true)
    .select("cart_enabled,browse_enabled,onsite_enabled").single();
  return error ? NextResponse.json({ error: "Settings could not be saved" }, { status: 503 }) : NextResponse.json({ settings: data });
}

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  // Explicit preview only. Customer sends are called by the separate secret-protected scheduler.
  const action = (await request.json().catch(() => null))?.action;
  if (action !== "dry_run") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  try {
    const [settings, activity] = await Promise.all([recoverySettings(), recoveryQueueSummary()]);
    const now = Date.now();
    const dueCart = activity.filter(item => item.kind === "cart" && !item.suppressed_at && now - new Date(item.last_active_at).getTime() >= (item.first_sent_at ? 24 : 3) * 3600_000 && !item.second_sent_at).length;
    const dueBrowse = activity.filter(item => item.kind === "browse" && !item.suppressed_at && now - new Date(item.last_active_at).getTime() >= 24 * 3600_000 && !item.first_sent_at).length;
    return NextResponse.json({ dryRun: true, dueCart, dueBrowse, settings, customerEmailsSent: 0, deliveryLocked: process.env.RECOVERY_EMAIL_DELIVERY_ENABLED !== "true" });
  } catch { return NextResponse.json({ error: "Dry run unavailable" }, { status: 503 }); }
}
