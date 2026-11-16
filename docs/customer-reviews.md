# Customer reviews on development

## Essential launch scope

The `product_reviews` migration is installed in the shared Supabase project. It creates a private moderated review table and a private photo bucket. The form lives at `/review/?product=<slug>`; PDPs link to it. Staff approve or reject submissions at `/admin/reviews/`. Only approved reviews are returned to shoppers. Email addresses and pending reviews remain server side. A verified purchase badge requires both a matching paid order and a confirmed, signed-in account with the same email. Guest submissions remain unverified until a secure proof-of-purchase flow is added.

The review request email is previewable at `/admin/post-purchase/`. **No request automation is enabled.** The signed Mintsoft delivered callback can set a trusted delivery source for a live paid order, but a real courier delivery callback remains untested. Purchase and dispatch dates do not stand in for delivery.

## Enabling the 12-day request

The post-purchase worker schedules one review request per paid order at 10 am Sydney time 12 calendar days after confirmed delivery. It includes a product-specific review link for each distinct purchased item not already reviewed by that email. It requires current marketing consent and checks unsubscribe, returns, support cases and the trusted delivery source before sending. Its global and individual switches are off. Test a genuine courier delivery callback and the staff-only email preview before activation; see `docs/post-purchase-journey.md`.

## Later enhancements

The schema records 1–5 rating, three-way fit feedback, optional image, and verified purchase provenance. Once enough approved reviews exist, add a separate customer fit summary; do not mix it with IGNYTE's product fit advice. Add a secure guest proof-of-purchase token, more spam controls, pagination, and resilient notification outbox before a high-volume launch.
