import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { firstFitRequestsEnabled, fitGuaranteeError } from "@/lib/first-fit-promise";
import { firstFitApprovedEmail, firstFitDispatchedEmail } from "@/lib/first-fit-emails";
import { queueReturnEmail } from "@/lib/return-outbox";
import type { ReturnItem } from "@/lib/returns";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
const schema = z.object({
  return_id: z.uuid(), action: z.enum(["approve_eligibility", "decline_eligibility", "instructions_provided", "received_by_3pl", "inspection_passed", "inspection_failed", "record_dispatch", "complete"]),
  note: z.string().trim().max(3000).default(""),
  replacement_reference: z.string().trim().max(150).default(""),
  tracking_url: z.url().startsWith("https://").max(1000).or(z.literal("")).default(""),
});

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Administrators only" }, { status: 403, headers: noStore });
  if (!firstFitRequestsEnabled) return NextResponse.json({ error: "IGNYTE Fit Guarantee exchange management is inactive." }, { status: 409, headers: noStore });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the action, note, fulfilment reference and tracking URL." }, { status: 400, headers: noStore });
  const values = parsed.data;
  const db = adminDb();
  const { data: settings } = await db.from("return_settings").select("first_fit_enabled").eq("id", true).maybeSingle();
  if (!settings?.first_fit_enabled) return NextResponse.json({ error: "The programme is disabled." }, { status: 409, headers: noStore });
  const { data: record } = await db.from("return_requests").select("id,reference,customer_name,customer_email,items,request_type").eq("id", values.return_id).maybeSingle();
  if (!record || record.request_type !== "first_fit") return NextResponse.json({ error: "Exchange record not found." }, { status: 404, headers: noStore });
  const { data: exchange } = await db.from("first_fit_exchanges").select("requested_size").eq("return_id", record.id).maybeSingle();
  if (!exchange) return NextResponse.json({ error: "Exchange details are unavailable." }, { status: 404, headers: noStore });
  const { error } = await db.rpc("record_first_fit_step", { p_return_id: record.id, p_actor: staff.user.id,
    p_action: values.action, p_note: values.note, p_replacement_reference: values.replacement_reference, p_tracking_url: values.tracking_url });
  if (error) return NextResponse.json({ error: error.message ? fitGuaranteeError(error.message) : "Exchange update failed." }, { status: 409, headers: noStore });
  const item = (record.items as ReturnItem[])[0];
  if (item && ["instructions_provided", "record_dispatch"].includes(values.action)) {
    const mailRecord = { customer_name: record.customer_name, reference: record.reference, product_name: item.product_name, current_size: item.size, requested_size: exchange.requested_size };
    const message = values.action === "instructions_provided" ? firstFitApprovedEmail(mailRecord, values.note) : firstFitDispatchedEmail(mailRecord, values.tracking_url);
    try { await queueReturnEmail(`${record.id}:first-fit:${values.action}`, record.id, record.customer_email, message); }
    catch { return NextResponse.json({ ok: true, warning: "The exchange was updated, but its email could not be queued. Contact the customer and check the email log." }, { headers: noStore }); }
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
