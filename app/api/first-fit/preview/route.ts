import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { firstFitPublic } from "@/lib/first-fit-promise";

export async function GET(request: Request) {
  if (firstFitPublic || await verifiedStaff(request)) return NextResponse.json({ preview: !firstFitPublic }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ error: "Private preview" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
