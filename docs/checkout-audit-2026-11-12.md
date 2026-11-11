# IGNYTE checkout audit · 12 November 2026

Scope: development site and repository at commit `902c0e5`; code review and read-only HTTP probes. Stripe is configured as **sandbox**. Development shares the main Supabase database and transactional email system, so no test order or card payment was created. No physical iPhone or Android device was available. “Working” below means the stated part was actually probed, not an end-to-end purchase.

| Area | Status | Finding and evidence | Priority | Effort |
| --- | --- | --- | --- | --- |
| Apple Pay / Google Pay | Unable to Verify | The app uses hosted Stripe Checkout; wallet display depends on Stripe/browser/merchant settings. No physical supported device or Stripe dashboard verification was available. There is no separate on-page express wallet button. | P2 | M |
| Guest checkout | Unable to Verify | Guest order creation and a protected order cookie are implemented in `app/api/checkout/manual/route.ts`; guest order read and payment-start routes verify that cookie. A complete guest purchase and email were not run. | P1 | M |
| Address autocomplete | Not Implemented | Manual Australian address fields and browser autofill tokens exist; no address provider or street/suburb/postcode matching exists. Unit/apartment line 2 is optional. | P2 | L |
| Shipping calculations | Needs Improvement | Read-only NSW quotes returned AU$15 at 9,999 cents and free at 10,000/12,000 cents. Checkout passes discounted merchandise amount to the quote. Stripe Checkout can collect a different Australian shipping state after the app fixes its shipping amount; the webhook checks AU country and total, but not that the final state matches the quoted state. This can charge the wrong state rate. | P0 | L |
| Free shipping messaging | Working | Bag progress and checkout quote use the same 10,000-cent threshold; coupon discount reduces the basis before quoting. No celebration animation was physically tested. Admin `free_threshold_cents` is read but the active rule remains the shared fixed threshold; confirm that this is intentional before changing it. | P2 | S |
| Cart persistence | Needs Improvement | Bag, selected size and quantity are stored in browser localStorage and remain on Stripe cancel. A cancel/refresh loses the in-memory request fingerprint and can create a new unpaid order on retry, leaving the earlier reserved order until expiry or cleanup. No guest/account merge test was run. | P1 | M |
| Payment failures / retries | Needs Improvement | The hosted payment path has an in-flight guard. Once a stored Stripe session expires, `app/api/stripe/start/route.ts` returns “contact support” rather than a self-service retry. The cancel URL does not surface a specific cancellation message in the checkout UI. Declines, authentication and network interruption were not exercised. | P1 | M |
| Mobile Safari | Unable to Verify | Responsive CSS and 16px field text exist. Physical iPhone Safari, Apple Pay, keyboard/autofill and landscape tests are outstanding. | P1 | M |
| Marketing consent | Needs Improvement | The approved compact two-line opt-in is deployed, optional and unchecked by default. Backend records wording version, source and timestamp, including verified guest checkout consent via the protected order cookie. A signed-in/guest write and unsubscribe cycle was not run; the actual checkbox layout is only rendered with a nonempty bag. | P2 | S |
| Duplicate payment prevention | Unable to Verify | Stripe webhook signature rejection returned HTTP 400. `complete_order` locks the row and is idempotent for the same session; Stripe session/coupon creation use idempotency keys. The order email outbox has a unique event key, but concurrent dispatch or a send-success/DB-update failure can resend a confirmation. No concurrent webhook or charge test was run. | P1 | M |
| Performance | Unable to Verify | Linux production build passed. No device/network traces or Core Web Vitals measurement were taken. Hosted Stripe loads only when payment starts. | P2 | S |
| Accessibility | Needs Improvement | Fields have visible labels and checkout errors use `role="alert"`; the unavailable-item message lacked an alert role before this audit. Keyboard and screen-reader interaction require browser/device testing. | P2 | XS |

## Completed low-risk changes

- Reused the one existing checkout checkbox with the approved two-line copy, larger input/tap area, subtle brand accent, visible focus state and Privacy Policy link. Kept it optional and unchecked.
- Recorded the new consent wording version separately from the older long-form reminder wording. Guest checkout consent is verified against its order cookie before an existing subscriber is updated.
- Added `role="alert"` to the unavailable-item message so a stock change is announced. No payment or shipping rule was altered.

## Approval-needed payment work

1. **P0 · Final shipping state and cost:** Decide whether Stripe must restrict the final address to the quoted state, or reprice shipping when the customer changes state. Reconcile that final address and amount in the signed webhook. Estimate L (1–2 days), with payment regression risk.
2. **P1 · Cancel/expired-session recovery:** Reuse or safely expire/recreate the existing session and order, preserve the bag and show a clear retry path without reserving stock twice. Estimate M (3–8 hours), with order/inventory regression risk.
3. **P1 · Confirmation email dispatch:** Atomically claim outbox rows or use a durable send state and provider reference so concurrent/retried webhooks cannot send duplicates. Estimate M (3–8 hours), with email-delivery risk.
4. **P2 · Address autocomplete:** Consider an AU address provider with manual fallback after pricing and data-handling approval. Estimate L (1–2 days) plus provider cost.

## Test boundary

Read-only probes: `/api/payment/status` reported Stripe sandbox; `/api/shipping/quote` returned AU$15 at 9,999 cents and free delivery at 10,000 cents; unsigned `/api/stripe/webhook` returned HTTP 400; the development checkout and admin page returned HTTP 200. TypeScript and the Linux production build passed. Card outcomes, wallet availability, email delivery, real address changes, inventory effects, guest order access, consent writes, mobile Safari and screen reader behaviour remain **unverified end to end**. Use an isolated database and test-mail sink, or an explicitly planned test-order cleanup, before running payment scenarios.
