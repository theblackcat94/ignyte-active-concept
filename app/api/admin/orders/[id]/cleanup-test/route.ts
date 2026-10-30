import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  const db = adminDb();
  const { error } = await db.rpc("cleanup_sandbox_stripe_order", { p_order_id: id });
  if (error) return NextResponse.json({ error: "Only a marked Stripe test order can be cleaned up." }, { status: 409 });
  return NextResponse.json({ status: "cancelled" });
}
