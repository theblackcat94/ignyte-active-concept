import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { retryPendingOrderEmails } from "@/lib/order-email-outbox";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const result = await retryPendingOrderEmails();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Could not retry order emails", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Pending emails could not be retried." }, { status: 503 });
  }
}
