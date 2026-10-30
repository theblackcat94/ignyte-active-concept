# Payment provider configuration

The selected merchant is controlled per deployment with the server-only `PAYMENT_PROVIDER` setting:

- `eway` uses the existing eWAY integration and `EWAY_ENVIRONMENT` setting.
- `stripe` uses Stripe Checkout. The environment is detected from the Stripe key prefix.
- `manual` saves an order request without collecting payment.

For Stripe sandbox, set `PAYMENT_PROVIDER=stripe`, use a Stripe test restricted key (`rk_test_…`) and the test webhook signing secret in the staging env file. The configured site URL must be `https://dev.ignyteactive.com`; the server refuses to enable a test key on the live domain. For live Stripe, use a live restricted key, live webhook signing secret, `PAYMENT_PROVIDER=stripe`, and `https://ignyteactive.com`. Never copy test keys into the production env file.

The restricted server key needs Checkout Sessions read/write and Coupons write access. Configure a webhook endpoint at `/api/stripe/webhook` for `checkout.session.completed` and `checkout.session.expired`; save its signing secret as `STRIPE_WEBHOOK_SECRET`. Stripe Checkout applies the app-validated coupon and the exact shipping amount already saved on the order.

Sandbox orders use fake payments but reserve stock in the shared Supabase database. The admin Orders page labels them `TEST ORDER` and provides **CLEAN UP TEST ORDER & RETURN STOCK** after the test. Do not use that control for a live order.

Test card: `4242 4242 4242 4242`, any future expiry date, and any three-digit CVC. Use test-mode keys and the Stripe sandbox only.
