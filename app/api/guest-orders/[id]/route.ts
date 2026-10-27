import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";
import { orderSelect } from "@/lib/order";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const token = request.cookies.get(`ignyte_guest_order_${id.replaceAll("-", "")}`)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: "This guest order is available only in the browser used at checkout." }, { status: 403 });
  }
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await adminDb().from("orders").select(orderSelect)
    .eq("id", id).is("user_id", null).eq("guest_token_hash", hash)
    .gt("guest_token_expires_at", new Date().toISOString()).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Order not found or access has expired." }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
