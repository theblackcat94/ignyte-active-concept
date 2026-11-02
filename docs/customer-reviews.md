# Customer reviews on development

## Essential launch scope

Apply `supabase/migrations/202611020001_product_reviews.sql` in the existing Supabase project before testing submissions. This creates a private moderated review table, a private photo bucket, and delivery confirmation fields. The public form lives at `/review/?product=<slug>`; PDPs link to it. Staff approve or reject submissions at `/admin/reviews/`. Only approved reviews are returned to shoppers. Email addresses and pending reviews remain server side. A verified purchase badge requires both a matching paid order and a confirmed, signed-in account with the same email. Guest submissions remain unverified until a secure proof-of-purchase flow is added.

The review request email is previewable at `/admin/reviews/email-preview/`. **No request automation is enabled.** The current order schema has no confirmed delivery events. Purchase and dispatch dates must not stand in for delivery.

## Enabling the 12-day request

Connect a carrier or fulfilment webhook that supplies order ID, actual delivered timestamp, and an authenticated source. Update `orders.delivered_at` only for confirmed deliveries. Then run a daily scheduler that selects paid, non-refunded orders with `delivered_at <= now() - interval '12 days'`, builds one branded email with a product-specific review link for each distinct purchased product, and records one `review_requests` row per order before sending through the existing SES outbox. An order cancelled or refunded before dispatch must be excluded. Test with controlled delivery events and addresses before enabling real sends. Confirm the legal basis and unsubscribe or suppression rules for post-purchase review requests before activation.

## Later enhancements

The schema records 1–5 rating, three-way fit feedback, optional image, and verified purchase provenance. Once enough approved reviews exist, add a separate customer fit summary; do not mix it with IGNYTE's product fit advice. Add a secure guest proof-of-purchase token, more spam controls, pagination, and resilient notification outbox before a high-volume launch.
