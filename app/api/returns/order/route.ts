import { NextRequest, NextResponse } from "next/server";
import { accessibleReturnOrder } from "@/lib/returns";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams;
  const email = query.get("email")?.trim().toLowerCase() || "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter the email address used for this order." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const order = await accessibleReturnOrder(request, query.get("number") || "");
  return order && order.customer_email.toLowerCase() === email ? NextResponse.json(order, { headers: { "Cache-Control": "private, no-store" } })
    : NextResponse.json({ error: "We couldn't verify this order in this browser. Sign in if you have an account, or enter the item details manually for our team to review." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
