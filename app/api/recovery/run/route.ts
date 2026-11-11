import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processRecoveryQueue } from "@/lib/recovery-worker";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RECOVERY_CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !provided || Buffer.byteLength(secret) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(secret), Buffer.from(provided)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (process.env.RECOVERY_EMAIL_DELIVERY_ENABLED !== "true") return NextResponse.json({ error: "Customer email delivery is disabled" }, { status: 409 });
  try { return NextResponse.json(await processRecoveryQueue()); }
  catch (error) { console.error("Recovery scheduler failed", error instanceof Error ? error.message : "Unknown error"); return NextResponse.json({ error: "Recovery run failed" }, { status: 503 }); }
}
