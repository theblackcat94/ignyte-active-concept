import assert from "node:assert/strict";
import test from "node:test";
import { parseMintsoftShippingEvent } from "../lib/mintsoft-webhook.ts";

const orderId = "9e95b88b-01cc-49e3-bc68-60f289f540ed";

test("accepts a tracked Mintsoft order by its website UUID", () => {
  assert.deepEqual(parseMintsoftShippingEvent({
    SourceOrderId: orderId, TrackingNumber: "TRACK-123",
    TrackingURL: "https://example-carrier.test/track/TRACK-123", CourierService: "StarShipIT",
  }), {
    orderId, trackingNumber: "TRACK-123",
    trackingUrl: "https://example-carrier.test/track/TRACK-123", carrier: "StarShipIT",
  });
});

test("accepts an order wrapped in a delivered callback", () => {
  assert.equal(parseMintsoftShippingEvent({ Order: { SourceOrderId: orderId }, Events: [] })?.orderId, orderId);
});

test("reads the courier service name from Mintsoft's order response", () => {
  assert.equal(parseMintsoftShippingEvent({ OrderNumber: orderId, CourierServiceName: "Standard" })?.carrier, "Standard");
});

test("formats Mintsoft's Australia Post tracking template", () => {
  assert.equal(parseMintsoftShippingEvent({ SourceOrderId: orderId, CourierServiceId: 2057,
    TrackingNumber: "AP 123/45", TrackingURL: "https://auspost.com.au/mypost/track/#/details/{0}" })?.trackingUrl,
  "https://auspost.com.au/mypost/track/#/details/AP%20123%2F45");
});

test("builds a tracking link for AusPost when Mintsoft supplies no URL", () => {
  assert.equal(parseMintsoftShippingEvent({ SourceOrderId: orderId, CourierServiceId: 2058,
    CourierServiceName: "AusPost", TrackingNumber: "AP12345" })?.trackingUrl,
  "https://auspost.com.au/mypost/track/#/details/AP12345");
  assert.equal(parseMintsoftShippingEvent({ SourceOrderId: orderId, CourierServiceId: 2071,
    CourierServiceName: "CLIENT-PICKUP", TrackingNumber: "TEST" })?.trackingUrl, null);
});

test("rejects unlinked orders and unsafe tracking links", () => {
  assert.equal(parseMintsoftShippingEvent({ OrderNumber: "OTHER-ORDER" }), null);
  assert.equal(parseMintsoftShippingEvent({ SourceOrderId: orderId, TrackingURL: "javascript:alert(1)" })?.trackingUrl, null);
  assert.equal(parseMintsoftShippingEvent({ SourceOrderId: orderId, TrackingURL: "https://auspost.com.au/track/{0}" })?.trackingUrl, null);
});
