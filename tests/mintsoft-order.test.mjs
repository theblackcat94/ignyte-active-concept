import { test } from "node:test";
import assert from "node:assert/strict";
import { eligibleMintsoftOrder, mintsoftConnectAction, mintsoftOrderId, mintsoftOrderPayload } from "../lib/mintsoft-order.mjs";

const order = {
  id: "7cf13eba-21a6-4582-bf0a-e75a00f4ab8c", status: "paid",
  stock_reserved: true, mintsoft_order_id: null, eway_environment: "production",
  customer_email: "customer@example.com", total_cents: 12900,
  shipping_details: { name: "Alex Taylor", phone: "0400000000",
    address: { line1: "1 Example St", city: "Brisbane", state: "QLD",
      postal_code: "4000", country: "AU" } },
};

test("exports only genuine paid, reserved orders with stable references", () => {
  const payload = mintsoftOrderPayload(order,
    [{ sku: "SKU-1", quantity: 2, unit_price_cents: 6450 }], 51, 5);
  assert.equal(payload.OrderNumber, order.id);
  assert.equal(payload.ExternalOrderReference, order.id);
  assert.equal(payload.WarehouseId, 5);
  assert.equal(payload.OrderItems[0].UnitPrice, 64.5);
  for (const changed of [
    { status: "awaiting_payment" }, { stock_reserved: false },
    { mintsoft_order_id: 123 }, { eway_environment: "sandbox" },
    { shipping_details: { ...order.shipping_details, test_order: true } },
  ]) assert.equal(eligibleMintsoftOrder({ ...order, ...changed }), false);
});

test("rejects incomplete fulfilment details and accepts Mintsoft lookup IDs", () => {
  assert.throws(() => mintsoftOrderPayload({ ...order, shipping_details: {
    ...order.shipping_details, address: { ...order.shipping_details.address, postal_code: "" },
  } }, [{ sku: "SKU-1", quantity: 1, unit_price_cents: 100 }], 51, 5));
  assert.equal(mintsoftOrderId({ OrderId: 456 }), 456);
  assert.equal(mintsoftOrderId([{ OrderId: "456", Success: true }]), 456);
  assert.equal(mintsoftOrderId({ OrderId: null }), null);
});

test("registers authenticated dispatch and delivery callbacks for the website order", () => {
  const secret = "a".repeat(64);
  const action = mintsoftConnectAction(order.id, "https://ignyteactive.com", secret);
  const payload = mintsoftOrderPayload(order,
    [{ sku: "SKU-1", quantity: 1, unit_price_cents: 100 }], 51, 5, action, "STANDARD");
  assert.equal(payload.CourierService, "STANDARD");
  assert.equal(payload.ConnectAction.SourceOrderId, order.id);
  assert.equal(payload.ConnectAction.ExtraCode1, "https://ignyteactive.com/api/mintsoft/shipping/dispatched");
  assert.equal(payload.ConnectAction.ExtraCode3, "https://ignyteactive.com/api/mintsoft/shipping/delivered");
  assert.equal(payload.ConnectAction.ExtraCode4, `Bearer ${secret}`);
  assert.equal(mintsoftConnectAction(order.id, "https://ignyte.theblackcat94.com", secret).ExtraCode1,
    "https://ignyte.theblackcat94.com/api/mintsoft/shipping/dispatched");
  assert.throws(() => mintsoftConnectAction(order.id, "http://ignyteactive.com", secret));
  assert.throws(() => mintsoftConnectAction(order.id, "https://other.example", secret));
  assert.throws(() => mintsoftConnectAction(order.id, "https://ignyteactive.com", "short"));
});
