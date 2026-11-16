# Post-purchase journey

The three templates, private schedule table, admin previews and locked scheduler are prepared in code. The schedule migration was applied to IGNYTE's shared Supabase project on 16 November 2026. Its global setting and all three steps remain disabled. **No automatic customer post-purchase email is active.**

## Source and timing

- The job runner enrolls only paid orders with both `delivered_at` and `delivery_confirmation_source`. It never treats payment, fulfilment or dispatch as delivery. The signed Mintsoft production delivered callback can mark `mintsoft_tracking_events` as the source, but Dan advised on 17 November 2026 that Ignyte's current Mintsoft/courier setup does not provide delivered notifications. The isolated staging callback leaves the trusted source empty. Keep the journey disabled unless a genuine courier-delivered source is integrated and tested.
- The defaults are 3, 12 and 25 calendar days after confirmed delivery, at 10 am Australia/Sydney time with daylight saving accounted for. Delays, subjects, preheaders and opening copy are editable in `/admin/post-purchase/`.
- Jobs are unique by order and step. A claimed send is not automatically retried after an uncertain provider response, to avoid duplicates. Jobs more than 48 hours overdue are suppressed instead of being sent in a catch-up batch.
- The private 15-minute systemd timer uses the packaged runner. It exits without a request while `POST_PURCHASE_EMAIL_DELIVERY_ENABLED` is off. The endpoint also requires `POST_PURCHASE_CRON_SECRET`, an exact `POST_PURCHASE_ALLOWED_DELIVERY_SOURCE`, global settings and each step's enabled switch. These activation settings remain unset.

## Eligibility and suppression

- A confirmed marketing subscription with the new checkout consent wording version is required for guests and account holders. The guest checkout order cookie links a recorded opt-in to the order email. Older subscribers are not silently opted in. Unsubscribe status is checked before each send.
- The worker checks paid status, delivery source, open returns and support cases, newer purchases for the matching-set email, available purchased product data and relevant in-stock pairings. It limits this journey to two sent messages within seven days. Other marketing campaigns are not yet included in that shared frequency count.
- The review invitation links each distinct purchased product with `/review/?product=<slug>` and skips products the same email has already reviewed. Guest reviews are accepted as unverified and remain pending for staff moderation. The existing review form does not promise a verified-purchase badge to guests.
- Product pairing is sourced from the existing pairing map; there is no random recommendation fallback. If a relevant in-stock match is unavailable, email 3 is suppressed.

## Before activation

1. Obtain a genuine delivered signal from a supported Mintsoft courier, a carrier tracking API, or a trusted tracking provider. The current AusPost mapping and despatch tracking link do not provide that signal. Verify source authentication and a controlled delivered event before enabling any delivery-timed email.
2. Check the live domain, payment, SES deliverability, checkout marketing consent and unsubscribe flow. Send staff-only preview emails through `/admin/post-purchase/`.
3. Run controlled paid/delivered, cancelled/refunded, return, support, unsubscribe, multi-item and DST tests. Configure `POST_PURCHASE_CRON_SECRET`, set `POST_PURCHASE_ALLOWED_DELIVERY_SOURCE=mintsoft_tracking_events` and `POST_PURCHASE_EMAIL_DELIVERY_ENABLED=true`, then enable the global and individual steps after approval. The installed timer requires no further scheduling setup.
4. Improve guest proof-of-purchase verification, bounce suppression, shared marketing frequency accounting and reporting as follow-up work. Guest reviews remain unverified until proof of purchase exists.

The existing transactional order, payment and dispatch emails are separate from this journey.
