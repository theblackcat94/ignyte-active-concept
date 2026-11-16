# Ignyte live checkout cutover

Status at 17 November 2026: **do not accept live Stripe payments yet**. The
existing `ignyteactive.com` resolves to the current store, not the new release.
The new code is on `dev.ignyteactive.com`; the separate production server still
serves `ignyte.theblackcat94.com`. Production has no selected Stripe provider,
live Stripe API key, or live webhook signing secret. The test client 30 order,
Standard-to-AusPost mapping, Mintsoft despatch callback, tracking number and
dispatch email have passed isolated tests. Client 51 has not received a paid
website order. No courier delivered signal is available for the post-purchase
journey, which remains disabled.

## Prepare without taking payments

1. Merge the currently deployed website design with the Mintsoft integration,
   build an exact clean commit, and verify the combined release on dev.
2. Deploy that exact commit to the separate production server with checkout
   inactive. Set `NEXT_PUBLIC_SITE_URL=https://ignyteactive.com` for the final
   production build only when ready for the canonical domain. Verify the
   server, database migrations, live client-51 stock and order-export timers.
3. Arrange the live restricted Stripe server key and a **separate live webhook
   signing secret** through a secure credential channel. Configure the live
   Stripe event destination at
   `https://ignyteactive.com/api/stripe/webhook/` for
   `checkout.session.completed` and `checkout.session.expired`. Keep sandbox
   credentials on dev only. Do not paste credentials into Git, chat or email.
4. Coordinate the domain, TLS certificate, redirects, Supabase Auth URLs and
   existing-store shutdown. Preserve a rollback route and pause any legacy
   checkout before sending traffic to the new site.

## Controlled launch window

1. Point `ignyteactive.com` at the new production site and verify HTTPS and
   the live webhook endpoint before exposing checkout broadly.
2. Enable the live Stripe provider. Place one small real order to a controlled
   address. Confirm Stripe payment, a successful signed webhook, paid website
   status, stock reservation, confirmation email and exactly one export to
   Mintsoft client 51.
3. Ask Fulfilpackers to confirm receipt, Standard/AusPost mapping, real
   despatch and a usable real tracking number/link. Do not wait for a delivered
   callback: the current courier setup is not expected to send one.
4. Review the first live orders and both stock/order-export timer journals.
   Roll back checkout or DNS if payment acknowledgement or fulfilment fails.

Delivery confirmation and the day 3/12/25 email sequence remain off until a
separate trusted carrier event feed is available and tested.
