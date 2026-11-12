import test from "node:test";
import assert from "node:assert/strict";
import { browseRule, engagementScore } from "../lib/browse-rules.ts";

const now = Date.parse("2026-11-12T12:00:00Z");
const eligible = { now, lastActiveAt: new Date(now - 24 * 3600_000).toISOString(), delayHours: 24,
  meaningful: true, consent: true, available: true, inBag: false, purchased: false,
  activeCart: false, sentWithinWeek: false, alreadySent: false };

test("a consented, meaningful browse becomes eligible at 24 hours", () => {
  assert.equal(browseRule(eligible), null);
  assert.equal(browseRule({ ...eligible, now: now - 1 }), "not_due");
});

test("add-to-bag, purchase, unsubscribe and seven-day frequency suppress", () => {
  assert.equal(browseRule({ ...eligible, inBag: true }), "added_to_bag");
  assert.equal(browseRule({ ...eligible, purchased: true }), "purchased");
  assert.equal(browseRule({ ...eligible, consent: false }), "no_active_consent");
  assert.equal(browseRule({ ...eligible, sentWithinWeek: true }), "frequency_limit");
  assert.equal(browseRule({ ...eligible, activeCart: true }), "active_cart_recovery");
});

test("passive visits, unavailable products and already sent cycles do not qualify", () => {
  assert.equal(browseRule({ ...eligible, meaningful: false }), "insufficient_engagement");
  assert.equal(browseRule({ ...eligible, available: false }), "unavailable");
  assert.equal(browseRule({ ...eligible, alreadySent: true }), "already_sent");
});

test("stronger interaction wins without allowing a weaker visit to reset the timer", () => {
  assert.ok(engagementScore({ activeSeconds: 30, interaction: "size", repeatVisit: true }) >
    engagementScore({ activeSeconds: 20, interaction: "gallery" }));
});
