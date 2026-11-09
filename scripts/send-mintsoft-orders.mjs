import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { eligibleMintsoftOrder, mintsoftConnectAction, mintsoftOrderId, mintsoftOrderPayload } from "../lib/mintsoft-order.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
if (process.argv.some((arg, index) => index > 1 && arg !== "--apply")) {
  throw new Error("Usage: npm run send:mintsoft-orders -- [--apply]");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const apiKey = process.env.MINTSOFT_API_KEY;
const clientId = Number(process.env.MINTSOFT_CLIENT_ID);
const warehouseId = Number(process.env.MINTSOFT_WAREHOUSE_ID);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const callbackSecret = process.env.MINTSOFT_WEBHOOK_SECRET;
const courierService = process.env.MINTSOFT_COURIER_SERVICE || "AUTO";
if (!url || !secret || !apiKey || !Number.isSafeInteger(clientId) || clientId < 1 ||
    !Number.isSafeInteger(warehouseId) || warehouseId < 1 || !siteUrl || !callbackSecret) {
  throw new Error("Supabase, Mintsoft and callback server settings are required");
}
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function mintsoft(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`https://api.mintsoft.co.uk${path}`, {
      ...options,
      headers: { "ms-apikey": apiKey, Accept: "application/json",
        "Content-Type": "application/json", "User-Agent": "IgnyteOrderExport/1.0" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function lookup(orderId) {
  const result = await mintsoft(`/api/Order/GetOrderId?OrderNumber=${encodeURIComponent(orderId)}`);
  if (result.status === 404 && result.body?.OrderId == null) return null;
  if (!result.ok) throw new Error(`Mintsoft order lookup failed: HTTP ${result.status}`);
  const id = mintsoftOrderId(result.body);
  if (!id) throw new Error(`Mintsoft order lookup returned no ID for ${orderId}`);
  return id;
}

const { data: orders, error } = await db.from("orders")
  .select("id,status,stock_reserved,mintsoft_order_id,eway_environment,shipping_details,customer_email,total_cents,paid_at")
  .eq("status", "paid").eq("stock_reserved", true).is("mintsoft_order_id", null)
  .order("paid_at", { ascending: true }).limit(1000);
if (error) throw error;
const eligible = orders.filter(eligibleMintsoftOrder);
console.info(`Paid orders awaiting Mintsoft acknowledgement: ${eligible.length}`);
let failures = 0;
for (const order of eligible) {
  try {
    const { data: items, error: itemsError } = await db.from("order_items")
      .select("sku,quantity,unit_price_cents").eq("order_id", order.id);
    if (itemsError) throw itemsError;
    const connectAction = mintsoftConnectAction(order.id, siteUrl, callbackSecret);
    const payload = mintsoftOrderPayload(order, items, clientId, warehouseId, connectAction, courierService);
    if (!apply) {
      console.info(`Dry run: order ${order.id}, ${payload.OrderItems.length} item lines`);
      continue;
    }
    let id = await lookup(order.id);
    if (!id) {
      let result;
      try {
        result = await mintsoft("/api/Order", { method: "PUT", body: JSON.stringify(payload) });
      } catch (failure) {
        throw new Error(`Mintsoft submission uncertain for ${order.id}; lookup again before retry: ${failure.message}`);
      }
      const responseOrder = Array.isArray(result.body) ? result.body[0] : result.body;
      id = result.ok && responseOrder?.Success !== false ? mintsoftOrderId(result.body) : null;
      if (!id) {
        // Mintsoft enforces unique order references; recover a successful but lost response.
        id = await lookup(order.id);
      }
      if (!id) throw new Error(`Mintsoft rejected order ${order.id}: HTTP ${result.status}; check Mintsoft failed orders`);
    }
    const { data: saved, error: saveError } = await db.from("orders")
      .update({ mintsoft_order_id: id }).eq("id", order.id).eq("status", "paid")
      .is("mintsoft_order_id", null).select("id").maybeSingle();
    if (saveError) throw saveError;
    if (!saved) throw new Error(`Mintsoft order ${id} exists but website acknowledgement failed for ${order.id}`);
    console.info(`Mintsoft acknowledged website order ${order.id} as ${id}`);
  } catch (failure) {
    failures += 1;
    console.error(`Mintsoft export failed for ${order.id}: ${failure instanceof Error ? failure.message : "Unknown error"}`);
  }
}
if (!apply) console.info("Dry run only. Pass --apply to submit paid orders.");
if (failures) throw new Error(`${failures} paid orders could not be exported`);
