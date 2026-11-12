import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { assertActiveSkusCovered, parseMintsoftStockLevels } from "../lib/mintsoft-stock.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apply = process.argv.includes("--apply");
if (process.argv.some((arg) => arg !== "--apply" && arg !== process.argv[0] && arg !== process.argv[1])) {
  throw new Error("Usage: npm run sync:mintsoft-stock -- [--apply]");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const apiKey = process.env.MINTSOFT_API_KEY;
const warehouseId = Number(process.env.MINTSOFT_WAREHOUSE_ID);
const clientId = Number(process.env.MINTSOFT_CLIENT_ID);
if (!url || !secret || !apiKey || !Number.isSafeInteger(warehouseId) || warehouseId < 1 ||
    !Number.isSafeInteger(clientId) || clientId < 1) {
  throw new Error("Supabase, Mintsoft API key, warehouse ID, and client ID are required");
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const params = new URLSearchParams({ WarehouseId: String(warehouseId), ClientId: String(clientId), Breakdown: "false" });
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20000);
let response;
try {
  response = await fetch(`https://api.mintsoft.co.uk/api/Product/StockLevels?${params}`, {
    headers: { "ms-apikey": apiKey, "User-Agent": "IgnyteStockSync/1.0", Accept: "application/json" },
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeout);
}
if (!response.ok) {
  throw new Error(`Mintsoft stock request failed: HTTP ${response.status}`);
}
const rows = await response.json();
const levels = parseMintsoftStockLevels(rows, warehouseId, clientId);

const { data: variants, error } = await db.from("product_variants")
  .select("sku,stock_on_hand,mintsoft_level,products!inner(status)")
  .eq("active", true).eq("products.status", "active");
if (error) throw error;
assertActiveSkusCovered(variants, levels);

const changed = variants.filter((variant) => variant.mintsoft_level !== levels.get(variant.sku.toUpperCase())).length;
console.info(`Mintsoft rows: ${rows.length}; active website SKUs matched: ${variants.length}; raw level differences: ${changed}`);
if (!apply) {
  console.info("Dry run only. Pass --apply to update Supabase.");
} else {
  const snapshot = [...levels].map(([sku, level]) => ({ sku, level }));
  const { data: updated, error: updateError } = await db.rpc("apply_mintsoft_stock_snapshot", {
    p_warehouse_id: warehouseId,
    p_levels: snapshot,
  });
  if (updateError) throw updateError;
  if (updated !== variants.length) throw new Error(`Snapshot updated ${updated} variants; expected ${variants.length}`);
  console.info(`Updated ${updated} active website variants from Mintsoft, accounting for website-only reservations.`);
}
