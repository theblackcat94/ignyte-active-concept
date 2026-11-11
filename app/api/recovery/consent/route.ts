import { NextResponse } from "next/server";
import { adminDb, verifiedUser } from "@/lib/commerce";
import { coversShoppingReminders } from "@/lib/marketing-consent";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await verifiedUser(request);
  if (!user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const { data, error } = await adminDb().from("marketing_subscribers")
      .select("status,recovery_consent_at,consent_wording_version").eq("email", user.email.toLowerCase()).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ eligible: data?.status === "confirmed", optedIn: data?.status === "confirmed" && Boolean(data.recovery_consent_at) && coversShoppingReminders(data.consent_wording_version) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Preference unavailable" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await verifiedUser(request);
  if (!user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.consent !== true) return NextResponse.json({ error: "Explicit consent required" }, { status: 400 });
  try {
    const db = adminDb();
    const { data, error } = await db.from("marketing_subscribers")
      .update({ recovery_consent_at: new Date().toISOString(), recovery_consent_source: "account", consent_wording_version: "recovery-v1-2026-11-12" })
      .eq("email", user.email.toLowerCase()).eq("status", "confirmed").select("email").maybeSingle();
    if (error) throw error;
    return data ? NextResponse.json({ optedIn: true }) : NextResponse.json({ error: "Join the IGNYTE email list before enabling product reminders." }, { status: 409 });
  } catch { return NextResponse.json({ error: "Preference could not be saved" }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const user = await verifiedUser(request);
  if (!user?.email) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const db = adminDb();
    const email = user.email.toLowerCase();
    const { error } = await db.from("marketing_subscribers").update({ recovery_consent_at: null, recovery_consent_source: null }).eq("email", email);
    if (error) throw error;
    await db.from("customer_recovery_activity").update({ suppressed_at: new Date().toISOString(), suppression_reason: "opted_out" }).eq("email", email).is("suppressed_at", null);
    return NextResponse.json({ optedIn: false });
  } catch { return NextResponse.json({ error: "Preference could not be saved" }, { status: 503 }); }
}
