import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/commerce";
import { accessibleReturnOrder, returnInputSchema, type ReturnItem } from "@/lib/returns";
import { returnAcknowledgementEmail, returnInternalEmail, type ReturnMailRecord } from "@/lib/return-emails";
import { queueReturnEmail } from "@/lib/return-outbox";

export const runtime = "nodejs";
const attempts = new Map<string, number>();
const imageTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
function validImage(bytes: Uint8Array, mime: string) {
  return mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ||
    mime === "image/png" && bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10" ||
    mime === "image/webp" && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
}
export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 16_000_000) return NextResponse.json({ error: "Uploads are limited to three photos under 5 MB each." }, { status: 413 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Please check your return details." }, { status: 400 });
  let items: unknown;
  try { items = JSON.parse(String(form.get("items") || "")); } catch { return NextResponse.json({ error: "Select the items you want to return." }, { status: 400 }); }
  const parsed = returnInputSchema.safeParse({ client_request_id: form.get("client_request_id"), customer_name: form.get("customer_name"), customer_email: form.get("customer_email"), order_number: form.get("order_number"), items, comments: form.get("comments") || "", requested_resolution: form.get("requested_resolution"), policy_accepted: form.get("policy_accepted") === "true", website: form.get("website") || "" });
  if (!parsed.success) return NextResponse.json({ error: "Complete your details, each item's size, colour, quantity and reason, and accept the policy." }, { status: 400 });
  const db = adminDb();
  const { data: existing } = await db.from("return_requests").select("id,reference,customer_email").eq("client_request_id", parsed.data.client_request_id).maybeSingle();
  if (existing) return existing.customer_email === parsed.data.customer_email ? NextResponse.json({ reference: existing.reference, duplicate: true }) : NextResponse.json({ error: "This request ID is already in use." }, { status: 409 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [key, time] of attempts) if (now - time > 60_000) attempts.delete(key);
  if (now - (attempts.get(ip) ?? 0) < 30_000) return NextResponse.json({ error: "Please wait briefly before sending another return request." }, { status: 429 });
  attempts.set(ip, now);
  const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
  if (photos.length > 3 || photos.some(photo => photo.size > 5_242_880 || !(photo.type in imageTypes))) return NextResponse.json({ error: "Use up to three JPEG, PNG or WebP photos under 5 MB each." }, { status: 400 });
  const order = await accessibleReturnOrder(request, parsed.data.order_number);
  const verified = Boolean(order && order.customer_email.toLowerCase() === parsed.data.customer_email);
  const statutory = parsed.data.items.some(item => ["Product is faulty", "Item arrived damaged", "Received an incorrect item"].includes(item.reason));
  if (statutory !== (parsed.data.requested_resolution === "statutory_remedy")) return NextResponse.json({ error: "Choose a refund option for change-of-mind items. Faulty or incorrect items are assessed separately under consumer law." }, { status: 400 });
  let validatedItems: ReturnItem[] = parsed.data.items.map(item => ({ product_name: item.product_name, sku: item.sku, size: item.size, colour: item.colour, quantity: item.quantity, reason: item.reason }));
  if (verified && order) {
    const seen = new Set<string>();
    const mapped: ReturnItem[] = [];
    for (const item of parsed.data.items) {
      const original = order.items.find(row => row.id === item.order_item_id);
      if (!original || seen.has(original.id) || item.quantity > original.quantity) return NextResponse.json({ error: "Choose purchased items and quantities from this order." }, { status: 400 });
      if (!statutory && original.sale_at_purchase === true) return NextResponse.json({ error: `${original.product_name} was purchased on sale and is not eligible for a change-of-mind return. Faulty-item rights remain available.` }, { status: 400 });
      seen.add(original.id);
      mapped.push({ order_item_id: original.id, product_name: original.product_name, sku: original.sku, size: original.size, colour: original.colour, quantity: item.quantity, reason: item.reason, original_unit_price_cents: original.unit_price_cents, list_price_at_purchase_cents: original.list_price_at_purchase_cents, sale_at_purchase: original.sale_at_purchase, paid_value_cents: Math.floor(original.paid_value_cents * item.quantity / original.quantity) });
    }
    validatedItems = mapped;
  }
  const uploadRoot = crypto.randomUUID();
  const uploaded: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!validImage(bytes, photo.type)) { if (uploaded.length) await db.storage.from("return-photos").remove(uploaded); return NextResponse.json({ error: "One photo has an invalid file format." }, { status: 400 }); }
    const path = `${uploadRoot}/${index + 1}-${crypto.randomUUID()}.${imageTypes[photo.type as keyof typeof imageTypes]}`;
    const { error } = await db.storage.from("return-photos").upload(path, bytes, { contentType: photo.type, upsert: false });
    if (error) { if (uploaded.length) await db.storage.from("return-photos").remove(uploaded); return NextResponse.json({ error: "Photo upload failed. Please try again." }, { status: 503 }); }
    uploaded.push(path);
  }
  const { data: created, error } = await db.from("return_requests").insert({ client_request_id: parsed.data.client_request_id, order_id: verified ? order?.id : null, order_number: parsed.data.order_number, order_verified: verified, customer_name: parsed.data.customer_name, customer_email: parsed.data.customer_email, items: validatedItems, comments: parsed.data.comments, photo_paths: uploaded, requested_resolution: parsed.data.requested_resolution, original_delivery_cents: verified ? order?.shipping_cents : null }).select("id,reference,order_number,customer_name,customer_email,items,submitted_at,requested_resolution").single();
  if (error || !created) {
    if (uploaded.length) await db.storage.from("return-photos").remove(uploaded);
    const { data: duplicate } = await db.from("return_requests").select("reference,customer_email").eq("client_request_id", parsed.data.client_request_id).maybeSingle();
    if (duplicate?.customer_email === parsed.data.customer_email) return NextResponse.json({ reference: duplicate.reference, duplicate: true });
    return NextResponse.json({ error: "We couldn't record your request. Please try again." }, { status: 503 });
  }
  await db.from("return_events").insert({ return_id: created.id, event_type: "submitted", to_status: "new_request" });
  const record = created as ReturnMailRecord;
  try {
    await queueReturnEmail(`${record.id}:ack`, record.id, record.customer_email, returnAcknowledgementEmail(record));
    const { data: settings } = await db.from("return_settings").select("notification_emails").eq("id", true).single();
    for (const address of settings?.notification_emails ?? []) await queueReturnEmail(`${record.id}:staff:${address}`, record.id, address, returnInternalEmail(record));
  } catch (cause) { console.error("Return email queue failed", cause instanceof Error ? cause.message : "Unknown error"); }
  return NextResponse.json({ reference: record.reference }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
