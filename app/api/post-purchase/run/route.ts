import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processPostPurchase } from "@/lib/post-purchase-worker";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.POST_PURCHASE_CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !provided || Buffer.byteLength(secret) !== Buffer.byteLength(provided) || !timingSafeEqual(Buffer.from(secret), Buffer.from(provided)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (process.env.POST_PURCHASE_EMAIL_DELIVERY_ENABLED !== "true") return NextResponse.json({ error: "Post-purchase email delivery is disabled" }, { status: 409 });
  try { return NextResponse.json(await processPostPurchase()); }
  catch (error) { console.error("Post-purchase run failed", error instanceof Error ? error.message : "Unknown error"); return NextResponse.json({ error: "Post-purchase run failed" }, { status: 503 }); }
}
