// One explicitly selected, paid Stripe sandbox order -> isolated Mintsoft client 30.
// Never install this script as a timer or give it the live Mintsoft API key.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { eligibleMintsoftOrder, mintsoftConnectAction, mintsoftOrderId, mintsoftOrderPayload } from "../lib/mintsoft-order.mjs";
import { parseMintsoftStockLevels } from "../lib/mintsoft-stock.mjs";

nextEnv.loadEnvConfig(process.cwd());
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const orderId = args[1] ?? "";
if (args[0] !== "--order" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(orderId) ||
    (args.length !== 2 && !(args.length === 3 && args[2] === "--apply"))) {
  throw new Error("Usage: node scripts/send-mintsoft-test-order.mjs --order <website-order-uuid> [--apply]");
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const clientId = Number(process.env.MINTSOFT_CLIENT_ID);
const warehouseId = Number(process.env.MINTSOFT_WAREHOUSE_ID);
const apiKey = process.env.MINTSOFT_TEST_API_KEY;
const callbackSecret = process.env.MINTSOFT_WEBHOOK_SECRET;
const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbSecret = process.env.SUPABASE_SECRET_KEY;
if (siteUrl !== "https://dev.ignyteactive.com" || clientId !== 30 || warehouseId !== 5 ||
    !apiKey || !callbackSecret || !dbUrl || !dbSecret || process.env.MINTSOFT_API_KEY) {
  throw new Error("This test requires staging site, isolated Mintsoft client 30 and its separate test key only");
}

const db = createClient(dbUrl, dbSecret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: order, error: orderError } = await db.from("orders")
  .select("id,status,stock_reserved,mintsoft_order_id,eway_environment,shipping_details,customer_email,total_cents,stripe_session_id")
  .eq("id", orderId).maybeSingle();
if (orderError || !order || !order.stripe_session_id || !eligibleMintsoftOrder(order, true)) {
  throw new Error("Order must be an explicitly selected, paid and reserved Stripe sandbox order");
}
const { data: items, error: itemError } = await db.from("order_items")
  .select("sku,quantity,unit_price_cents").eq("order_id", orderId);
if (itemError || !items?.length) throw new Error("Test order has no valid item lines");

async function mintsoft(path, options = {}) {
  const response = await fetch(`https://api.mintsoft.co.uk${path}`, {
    ...options,
    headers: { "ms-apikey": apiKey, Accept: "application/json", "Content-Type": "application/json",
      "User-Agent": "IgnyteIsolatedTest/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, body };
}

const stock = await mintsoft(`/api/Product/StockLevels?WarehouseId=${warehouseId}&ClientId=${clientId}`);
if (!stock.ok) throw new Error(`Test-client stock lookup failed: HTTP ${stock.status}`);
const levels = parseMintsoftStockLevels(stock.body, warehouseId, clientId);
for (const item of items) {
  if (!item.sku || levels.get(item.sku.toUpperCase()) < item.quantity) {
    throw new Error(`Test client 30 has insufficient stock for ${item.sku ?? "unknown SKU"}`);
  }
}

const action = mintsoftConnectAction(orderId, siteUrl, callbackSecret);
const payload = mintsoftOrderPayload(order, items, clientId, warehouseId, action,
  process.env.MINTSOFT_COURIER_SERVICE || "AUTO", true);
console.info(`Isolated client ${clientId}, warehouse ${warehouseId}, order ${orderId}, ${items.length} item lines`);
if (!apply) {
  console.info("Dry run only. Pass --apply to create the order in the isolated Mintsoft test client.");
  process.exit(0);
}

const found = await mintsoft(`/api/Order/GetOrderId?OrderNumber=${encodeURIComponent(orderId)}`);
let mintsoftId = found.ok ? mintsoftOrderId(found.body) : null;
if (!found.ok && found.status !== 404) throw new Error(`Test order lookup failed: HTTP ${found.status}`);
if (!mintsoftId) {
  const created = await mintsoft("/api/Order", { method: "PUT", body: JSON.stringify(payload) });
  const responseOrder = Array.isArray(created.body) ? created.body[0] : created.body;
  mintsoftId = created.ok && responseOrder?.Success !== false ? mintsoftOrderId(created.body) : null;
  if (!mintsoftId) {
    const retryLookup = await mintsoft(`/api/Order/GetOrderId?OrderNumber=${encodeURIComponent(orderId)}`);
    mintsoftId = retryLookup.ok ? mintsoftOrderId(retryLookup.body) : null;
  }
  if (!mintsoftId) throw new Error(`Mintsoft did not acknowledge the isolated test order: HTTP ${created.status}`);
}
console.info(`Mintsoft test client ${clientId} acknowledged ${orderId} as order ${mintsoftId}`);
console.info("This manual test does not update the live Mintsoft order ID field or the production export timer.");
