import { test } from "node:test";
import { strict as assert } from "node:assert";
import { assertActiveSkusCovered, parseMintsoftStockLevels } from "../lib/mintsoft-stock.mjs";

const row = (SKU, Level, WarehouseId = 5, ClientId = 51) => ({ SKU, Level, WarehouseId, ClientId });

test("normalizes Mintsoft SKUs and requires every active website SKU", () => {
  const levels = parseMintsoftStockLevels([row(" abc-m ", 12), row("ABC-L", 0)], 5, 51);
  assert.equal(levels.get("ABC-M"), 12);
  assert.doesNotThrow(() => assertActiveSkusCovered([{ sku: "abc-m" }, { sku: "ABC-L" }], levels));
  assert.throws(() => assertActiveSkusCovered([{ sku: "MISSING" }], levels), /missing active website SKUs/);
});

test("rejects partial, duplicate, wrong-client and invalid stock snapshots", () => {
  assert.throws(() => parseMintsoftStockLevels([], 5, 51), /no stock rows/);
  assert.throws(() => parseMintsoftStockLevels([row("A", 1), row("a", 2)], 5, 51), /Duplicate/);
  assert.throws(() => parseMintsoftStockLevels([row("A", 1, 6)], 5, 51), /unexpected warehouse/);
  assert.throws(() => parseMintsoftStockLevels([row("A", -1)], 5, 51), /invalid stock row/);
  assert.throws(() => parseMintsoftStockLevels([row("A", "1")], 5, 51), /invalid stock row/);
});
