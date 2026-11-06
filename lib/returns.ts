import { z } from "zod";
import { adminDb, verifiedUser } from "@/lib/commerce";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

export const returnReasons = ["Ordered the wrong size", "Fit wasn't right", "Changed my mind", "Product wasn't what I expected", "Received an incorrect item", "Item arrived damaged", "Product is faulty", "Other"] as const;
export const returnStatuses = ["new_request", "under_review", "awaiting_customer_return", "in_transit", "received_by_3pl", "inspection", "quarantined", "approved", "declined", "refunded", "closed"] as const;
export const returnStatusLabels: Record<(typeof returnStatuses)[number], string> = {
  new_request: "New Request", under_review: "Under Review", awaiting_customer_return: "Awaiting Customer Return",
  in_transit: "In Transit", received_by_3pl: "Received by 3PL", inspection: "Inspection",
  quarantined: "Quarantined / IGNYTE Review", approved: "Approved", declined: "Declined",
  refunded: "Refunded", closed: "Closed",
};
export const returnItemSchema = z.object({
  order_item_id: z.string().uuid().nullable().optional(),
  product_name: z.string().trim().min(1).max(180),
  sku: z.string().trim().max(100).default(""),
  size: z.string().trim().min(1).max(60),
  colour: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().min(1).max(20),
  reason: z.enum(returnReasons),
  sale_at_purchase: z.boolean().nullable().optional(),
  original_unit_price_cents: z.number().int().nonnegative().optional(),
  list_price_at_purchase_cents: z.number().int().nonnegative().nullable().optional(),
  paid_value_cents: z.number().int().nonnegative().optional(),
});
export type ReturnItem = z.infer<typeof returnItemSchema>;
export const returnInputSchema = z.object({
  client_request_id: z.string().uuid(),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.email().trim().toLowerCase().max(254),
  order_number: z.string().trim().min(3).max(100),
  items: z.array(returnItemSchema).min(1).max(20),
  comments: z.string().trim().max(3000).default(""),
  requested_resolution: z.enum(["store_credit", "original_payment", "statutory_remedy"]),
  policy_accepted: z.literal(true),
  website: z.string().max(0),
});

export type PurchasedItem = { id: string; product_name: string; sku: string; size: string; colour: string; quantity: number; unit_price_cents: number; list_price_at_purchase_cents: number | null; sale_at_purchase: boolean | null; paid_value_cents: number };
export type ReturnOrder = { id: string; customer_email: string; customer_name: string; created_at: string; paid_at: string | null; shipping_cents: number; items: PurchasedItem[] };

export async function accessibleReturnOrder(request: NextRequest, orderId: string): Promise<ReturnOrder | null> {
  if (!z.uuid().safeParse(orderId).success) return null;
  const user = await verifiedUser(request);
  const db = adminDb();
  const query = db.from("orders").select("id,user_id,customer_email,shipping_details,created_at,paid_at,status,shipping_cents,subtotal_cents,discount_cents,guest_token_hash,guest_token_expires_at,order_items(id,variant_id,product_name,sku,size,quantity,unit_price_cents,list_price_at_purchase_cents,sale_at_purchase)").eq("id", orderId);
  const { data: order, error } = await query.maybeSingle();
  if (error || !order || !["paid", "shipped", "fulfilled", "refunded"].includes(order.status)) return null;
  const owned = Boolean(user && order.user_id === user.id && user.email?.toLowerCase() === order.customer_email?.toLowerCase());
  const cookie = request.cookies.get(`ignyte_guest_order_${orderId.replaceAll("-", "")}`)?.value;
  const guest = Boolean(!order.user_id && cookie && /^[a-f0-9]{64}$/.test(cookie) && order.guest_token_hash === createHash("sha256").update(cookie).digest("hex") && order.guest_token_expires_at && new Date(order.guest_token_expires_at).getTime() > Date.now());
  if (!owned && !guest) return null;
  const ids = (order.order_items ?? []).map(item => item.variant_id).filter((id): id is string => Boolean(id));
  const { data: variants } = ids.length ? await db.from("product_variants").select("id,products(color)").in("id", ids) : { data: [] };
  const colours = new Map((variants ?? []).map(variant => [variant.id, Array.isArray(variant.products) ? variant.products[0]?.color : (variant.products as { color?: string } | null)?.color]));
  const purchased = order.order_items ?? [];
  let remainingDiscount = order.discount_cents || 0;
  const calculated = purchased.map((item, index) => {
    const gross = item.unit_price_cents * item.quantity;
    const allocated = index === purchased.length - 1 ? remainingDiscount : Math.min(remainingDiscount, Math.floor((order.discount_cents || 0) * gross / Math.max(1, order.subtotal_cents)));
    remainingDiscount -= allocated;
    return { id: item.id, product_name: item.product_name, sku: item.sku, size: item.size, colour: colours.get(item.variant_id) || "Colour as ordered", quantity: item.quantity, unit_price_cents: item.unit_price_cents, list_price_at_purchase_cents: item.list_price_at_purchase_cents, sale_at_purchase: item.sale_at_purchase, paid_value_cents: Math.max(0, gross - allocated) };
  });
  return { id: order.id, customer_email: order.customer_email ?? "", customer_name: (order.shipping_details as { name?: string } | null)?.name ?? "", created_at: order.created_at, paid_at: order.paid_at, shipping_cents: order.shipping_cents,
    items: calculated };
}
