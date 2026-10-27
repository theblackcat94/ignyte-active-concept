import { NextResponse } from "next/server";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }
  const db = adminDb();
  const { data: order, error: readError } = await db.from("orders").select("status").eq("id", id).single();
  if (readError || !order || order.status !== "awaiting_payment") {
    return NextResponse.json({ error: "Only unpaid order requests can be cancelled here." }, { status: 409 });
  }
  const { error } = await db.rpc("release_order", { p_order_id: id });
  if (error) return NextResponse.json({ error: "Order could not be cancelled." }, { status: 500 });
  const { data: updated } = await db.from("orders").select("status").eq("id", id).single();
  return updated?.status === "cancelled" ? NextResponse.json({ status: "cancelled" })
    : NextResponse.json({ error: "Order state changed; reload before cancelling." }, { status: 409 });
}
