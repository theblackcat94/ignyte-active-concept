import { NextRequest, NextResponse } from "next/server";
import { accessibleReturnOrder } from "@/lib/returns";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const order = await accessibleReturnOrder(request, new URL(request.url).searchParams.get("number") || "");
  return order ? NextResponse.json(order, { headers: { "Cache-Control": "private, no-store" } })
    : NextResponse.json({ error: "We couldn't verify this order in this browser. You can still enter the return details for our team to review." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
