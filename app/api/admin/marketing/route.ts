import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const page = Math.max(0, Math.min(10000, Number.parseInt(url.searchParams.get("page") ?? "0", 10) || 0));
  const pageSize = 100;
  const { data, error, count } = await adminDb().from("marketing_subscribers")
    .select("email,status,consent_at,source,created_at", { count: "exact" })
    .order("created_at", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
  return error ? NextResponse.json({ error: "Could not load subscribers." }, { status: 503 })
    : NextResponse.json({ subscribers: data, count: count ?? 0, page, pageSize });
}

export async function PATCH(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ email: z.email().trim().toLowerCase(), status: z.literal("unsubscribed") }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await adminDb().from("marketing_subscribers").update({ status: "unsubscribed" }).eq("email", parsed.data.email);
  return error ? NextResponse.json({ error: "Could not update subscriber." }, { status: 503 }) : NextResponse.json({ ok: true });
}
