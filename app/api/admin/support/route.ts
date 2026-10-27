import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await adminDb().from("support_tickets").select("*").order("created_at", { ascending: false }).limit(100);
  return error ? NextResponse.json({ error: "Could not load messages" }, { status: 503 }) : NextResponse.json(data);
}
export async function PATCH(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["open", "closed"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { error } = await adminDb().from("support_tickets").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  return error ? NextResponse.json({ error: "Could not update message" }, { status: 503 }) : NextResponse.json({ ok: true });
}
