import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid unsubscribe link." }, { status: 400 });
  try {
    const { error } = await adminDb().from("marketing_subscribers").update({ status: "unsubscribed" }).eq("unsubscribe_token", parsed.data.token);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update your preference. Please try again." }, { status: 503 });
  }
}
