import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";

export const runtime = "nodejs";

const schema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  consent: z.literal(true),
  website: z.string().max(0),
  source: z.enum(["footer", "checkout"]).optional(),
});
const attempts = new Map<string, number>();

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and agree to receive updates." }, { status: 400 });
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [key, time] of attempts) if (now - time > 60_000) attempts.delete(key);
  if (now - (attempts.get(address) ?? 0) < 15_000) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
  attempts.set(address, now);

  try {
    const db = adminDb();
    const { data: current, error: readError } = await db.from("marketing_subscribers").select("status").eq("email", parsed.data.email).maybeSingle();
    if (readError) throw readError;
    if (current?.status === "confirmed") return NextResponse.json({ ok: true });
    const record = {
      email: parsed.data.email,
      status: "confirmed",
      consent_at: new Date().toISOString(),
      source: parsed.data.source ?? "footer",
      unsubscribe_token: randomBytes(32).toString("hex"),
    };
    const { error } = await db.from("marketing_subscribers").upsert(record, { onConflict: "email" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save your signup. Please try again." }, { status: 503 });
  }
}
