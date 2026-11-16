import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { firstFitPublic } from "@/lib/first-fit-promise";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
const settingsSchema = z.object({
  first_fit_enabled: z.boolean(),
  first_fit_request_window_days: z.number().int().min(1).max(90).nullable(),
  first_fit_max_items: z.literal(1),
  first_fit_return_postage: z.enum(["pending", "customer", "ignyte"]),
  first_fit_replacement_postage: z.enum(["pending", "customer", "ignyte"]),
});

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const { data, error } = await adminDb().from("return_settings").select("first_fit_enabled,first_fit_request_window_days,first_fit_max_items,first_fit_return_postage,first_fit_replacement_postage").eq("id", true).single();
  return error ? NextResponse.json({ error: "IGNYTE Fit Guarantee settings are unavailable." }, { status: 503, headers: noStore }) : NextResponse.json({ settings: data, public_enabled: firstFitPublic }, { headers: noStore });
}

export async function PUT(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Administrators only" }, { status: 403, headers: noStore });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the request window and postage settings." }, { status: 400, headers: noStore });
  const settings = parsed.data;
  if (settings.first_fit_enabled && (!firstFitPublic || !settings.first_fit_request_window_days || settings.first_fit_return_postage === "pending" || settings.first_fit_replacement_postage === "pending"))
    return NextResponse.json({ error: "Approve all terms and deploy the public launch flag before enabling requests." }, { status: 409, headers: noStore });
  const { error } = await adminDb().from("return_settings").update({ ...settings, updated_at: new Date().toISOString() }).eq("id", true);
  return error ? NextResponse.json({ error: "Could not save IGNYTE Fit Guarantee settings." }, { status: 503, headers: noStore }) : NextResponse.json({ ok: true }, { headers: noStore });
}
