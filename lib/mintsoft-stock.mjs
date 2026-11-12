export function parseMintsoftStockLevels(rows, warehouseId, clientId) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Mintsoft returned no stock rows");
  const levels = new Map();
  for (const row of rows) {
    if (row.WarehouseId !== warehouseId || row.ClientId !== clientId ||
        typeof row.SKU !== "string" || !row.SKU.trim() ||
        !Number.isSafeInteger(row.Level) || row.Level < 0) {
      throw new Error("Mintsoft returned an invalid stock row or an unexpected warehouse/client");
    }
    const sku = row.SKU.trim().toUpperCase();
    if (levels.has(sku)) throw new Error(`Duplicate Mintsoft SKU: ${sku}`);
    levels.set(sku, row.Level);
  }
  return levels;
}

export function assertActiveSkusCovered(variants, levels) {
  if (!variants?.length) throw new Error("No active website variants found");
  const missing = variants.filter((variant) => !levels.has(variant.sku.toUpperCase()));
  if (missing.length) throw new Error(`Mintsoft snapshot is missing active website SKUs: ${missing.map((v) => v.sku).join(", ")}`);
}

export function assertOrderItemsAvailable(items, levels) {
  if (!Array.isArray(items) || items.length === 0 || !(levels instanceof Map)) {
    throw new Error("Test order stock check is invalid");
  }
  for (const item of items) {
    const available = typeof item.sku === "string" ? levels.get(item.sku.toUpperCase()) : undefined;
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        !Number.isSafeInteger(available) || available < item.quantity) {
      throw new Error(`Test client 30 has insufficient stock for ${item.sku ?? "unknown SKU"}`);
    }
  }
}
