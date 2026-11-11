# Post-purchase journey (private development build)

The three templates, private schedule table, admin previews and locked scheduler are prepared in code. **No customer post-purchase email is active.** The schema is in `supabase/migrations/202611120002_post_purchase_journey.sql`; it must be reviewed and applied separately to IGNYTE's shared Supabase database.

## Source and timing

- The job runner enrolls only paid orders with both `delivered_at` and `delivery_confirmation_source`. It never treats payment, fulfilment or dispatch as delivery. The repository has the two columns but **no trusted 3PL delivery event ingestion**. Integrate and authenticate the provider's delivered event before enabling this feature.
- The defaults are 3, 12 and 25 calendar days after confirmed delivery, at 10 am Australia/Sydney time with daylight saving accounted for. Delays, subjects, preheaders and opening copy are editable in `/admin/post-purchase/`.
- Jobs are unique by order and step. A claimed send is not automatically retried after an uncertain provider response, to avoid duplicates. Jobs more than 48 hours overdue are suppressed instead of being sent in a catch-up batch.
- The scheduler is protected by `POST_PURCHASE_CRON_SECRET`, `POST_PURCHASE_EMAIL_DELIVERY_ENABLED=true`, an exact `POST_PURCHASE_ALLOWED_DELIVERY_SOURCE`, global settings, and each step's enabled switch. No secret, delivery flag, trusted source or cron is configured by this commit.

## Eligibility and suppression

- A confirmed marketing subscription with the new checkout consent wording version is required for guests and account holders. The guest checkout order cookie links a recorded opt-in to the order email. Older subscribers are not silently opted in. Unsubscribe status is checked before each send.
- The worker checks paid status, delivery source, open returns and support cases, newer purchases for the matching-set email, available purchased product data and relevant in-stock pairings. It limits this journey to two sent messages within seven days. Other marketing campaigns are not yet included in that shared frequency count.
- Review invitations are **suppressed** until secure guest order verification and the existing review form are linked. The preview does not represent a ready-to-send guest review flow.
- Product pairing is sourced from the existing pairing map; there is no random recommendation fallback. If a relevant in-stock match is unavailable, email 3 is suppressed.

## Before activation

1. Review the migration and apply it to the correct database. Confirm the seeded settings and all three steps remain disabled.
2. Connect authenticated delivered events from the 3PL and verify the event timestamp against a real order. Add refund and support state reconciliation where needed.
3. Complete secure guest review verification, bounce suppression, shared marketing frequency accounting, click/conversion reporting, and editable full-body template support.
4. Review marketing consent wording and policy coverage for the complete journey, verify SES SPF/DKIM/DMARC and unsubscribe handling, and send staff-only test messages through the admin preview.
5. Run controlled paid/delivered, cancelled/refunded, return, support, unsubscribe, multi-item and DST tests. Obtain approval before setting the delivery environment flag or scheduling the cron request.

The existing transactional order, payment and dispatch emails are separate from this journey.
