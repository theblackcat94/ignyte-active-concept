import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";

export const runtime = "nodejs";
const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.email().trim().toLowerCase(), orderNumber: z.string().trim().max(100).optional(), message: z.string().trim().min(10).max(4000), website: z.string().max(0) });
const attempts = new Map<string, number>();
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Check the contact details and message." }, { status: 400 });
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [key, time] of attempts) if (now - time > 60_000) attempts.delete(key);
  if (now - (attempts.get(address) ?? 0) < 60_000) return NextResponse.json({ error: "Please wait a minute before sending another message." }, { status: 429 });
  attempts.set(address, now);
  const { error } = await adminDb().from("support_tickets").insert({ name: input.data.name, email: input.data.email, order_number: input.data.orderNumber || null, message: input.data.message });
  return error ? NextResponse.json({ error: "Could not save your message. Please try again." }, { status: 503 }) : NextResponse.json({ ok: true });
}
