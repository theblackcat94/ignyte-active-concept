import { NextResponse } from "next/server";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { firstFitPublic, firstFitRequestsEnabled } from "@/lib/first-fit-promise";

export async function GET(request: Request) {
  if (firstFitPublic || await verifiedStaff(request)) {
    const { data: settings } = firstFitRequestsEnabled ? await adminDb().from("return_settings").select("first_fit_enabled,first_fit_request_window_days,first_fit_return_postage,first_fit_replacement_postage").eq("id", true).maybeSingle() : { data: null };
    const active = firstFitRequestsEnabled && settings?.first_fit_enabled && settings.first_fit_request_window_days && settings.first_fit_return_postage !== "pending" && settings.first_fit_replacement_postage !== "pending";
    return NextResponse.json({ preview: !active, terms: active ? { request_window_days: settings.first_fit_request_window_days, return_postage: settings.first_fit_return_postage, replacement_postage: settings.first_fit_replacement_postage } : null }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ error: "Private preview" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
