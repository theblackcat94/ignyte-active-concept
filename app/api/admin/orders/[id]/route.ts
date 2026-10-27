import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { orderSelect } from "@/lib/order";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  const { data, error } = await adminDb().from("orders").select(orderSelect).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load order" }, { status: 500 });
  return data ? NextResponse.json(data) : NextResponse.json({ error: "Order not found" }, { status: 404 });
}
