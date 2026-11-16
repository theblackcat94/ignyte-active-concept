# Post-purchase journey

The three templates, private schedule table, admin previews and locked scheduler are prepared in code. The schedule migration was applied to IGNYTE's shared Supabase project on 16 November 2026. Its global setting and all three steps remain disabled. **No automatic customer post-purchase email is active.**

## Source and timing

- The job runner enrolls only paid orders with both `delivered_at` and `delivery_confirmation_source`. It never treats payment, fulfilment or dispatch as delivery. The signed Mintsoft production delivered callback marks `mintsoft_tracking_events` as the source. The isolated staging callback leaves the trusted source empty. A genuine courier delivered callback still needs testing with Dan.
- The defaults are 3, 12 and 25 calendar days after confirmed delivery, at 10 am Australia/Sydney time with daylight saving accounted for. Delays, subjects, preheaders and opening copy are editable in `/admin/post-purchase/`.
- Jobs are unique by order and step. A claimed send is not automatically retried after an uncertain provider response, to avoid duplicates. Jobs more than 48 hours overdue are suppressed instead of being sent in a catch-up batch.
- The scheduler is protected by `POST_PURCHASE_CRON_SECRET`, `POST_PURCHASE_EMAIL_DELIVERY_ENABLED=true`, an exact `POST_PURCHASE_ALLOWED_DELIVERY_SOURCE`, global settings, and each step's enabled switch. No secret, delivery flag, trusted source or cron is configured by this commit.

## Eligibility and suppression

- A confirmed marketing subscription with the new checkout consent wording version is required for guests and account holders. The guest checkout order cookie links a recorded opt-in to the order email. Older subscribers are not silently opted in. Unsubscribe status is checked before each send.
- The worker checks paid status, delivery source, open returns and support cases, newer purchases for the matching-set email, available purchased product data and relevant in-stock pairings. It limits this journey to two sent messages within seven days. Other marketing campaigns are not yet included in that shared frequency count.
- The review invitation links each distinct purchased product with `/review/?product=<slug>` and skips products the same email has already reviewed. Guest reviews are accepted as unverified and remain pending for staff moderation. The existing review form does not promise a verified-purchase badge to guests.
- Product pairing is sourced from the existing pairing map; there is no random recommendation fallback. If a relevant in-stock match is unavailable, email 3 is suppressed.

## Before activation

1. Confirm a real courier delivered event reaches the signed Mintsoft callback and records `delivery_confirmation_source=mintsoft_tracking_events` on a live, paid order. Dan must confirm carrier Tracking Events and send a controlled delivery event.
2. Check the live domain, payment, SES deliverability, checkout marketing consent and unsubscribe flow. Send staff-only preview emails through `/admin/post-purchase/`.
3. Run controlled paid/delivered, cancelled/refunded, return, support, unsubscribe, multi-item and DST tests. Configure a secret-protected daily cron, set `POST_PURCHASE_ALLOWED_DELIVERY_SOURCE=mintsoft_tracking_events` and `POST_PURCHASE_EMAIL_DELIVERY_ENABLED=true`, then enable the global and individual steps after approval.
4. Improve guest proof-of-purchase verification, bounce suppression, shared marketing frequency accounting and reporting as follow-up work. Guest reviews remain unverified until proof of purchase exists.

The existing transactional order, payment and dispatch emails are separate from this journey.
