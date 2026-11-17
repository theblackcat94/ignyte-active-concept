# Ignyte live checkout cutover

Status at 17 November 2026: **do not accept live Stripe payments yet**.
`ignyteactive.com` and `www.ignyteactive.com` now resolve to the Linode at
`172.105.186.242`, while `dev.ignyteactive.com` remains on the staging
Lightsail host at `54.253.19.1`. Release `71910a4` was built with
`NEXT_PUBLIC_SITE_URL=https://ignyteactive.com` and is healthy on production.
The live NGINX host has a Let's Encrypt certificate for apex and `www`, with
automatic renewal; `www` redirects to the apex. The preview hostname has an
`X-Robots-Tag: noindex, nofollow` response header. The payment status endpoint
still reports `manual` / `available: false`: there is no selected live Stripe
provider, live Stripe API key, or live webhook signing secret. On 17 November,
89 obsolete production releases were removed after approval. The active release
and three rollback copies remain; disk use fell from 96% to 47%, and the site
remained healthy. The test client 30 order,
Standard-to-AusPost mapping, Mintsoft despatch callback, tracking number and
dispatch email have passed isolated tests. Client 51 has not received a paid
website order. No courier delivered signal is available for the post-purchase
journey, which remains disabled.

## Completed preparation

1. The latest website design and Mintsoft integration have been merged,
   built, and deployed as `a740c7a` to dev and the production preview.
   TypeScript, 14 Mintsoft tests, endpoint smoke checks and deployment health
   checks passed. A read-only client-51 check matched all 48 active website
   SKUs with zero raw-level differences and found zero orders awaiting export.
2. Production disk cleanup and real-domain deployment are complete. The
   production app, NGINX and HTTPS endpoints passed health checks. The Mintsoft
   stock and order-export user timers are active and last exited successfully.
   Latest stock run matched all 48 active website SKUs with zero raw-level
   differences; the order job had zero paid orders awaiting acknowledgement.

## Still required before taking payments

1. Finish Stripe onboarding. Arrange the live restricted Stripe server key and a **separate live webhook
   signing secret** through a secure credential channel. Configure the live
   Stripe event destination at
   `https://ignyteactive.com/api/stripe/webhook/` for
   `checkout.session.completed` and `checkout.session.expired`. Keep sandbox
   credentials on dev only. Do not paste credentials into Git, chat or email.
2. Confirm Supabase Auth allows `https://ignyteactive.com/account` and
   `https://ignyteactive.com/account/reset` as redirect URLs. Check that the
   old store's checkout is paused so orders cannot split between systems.
   Preserve the DNS rollback route to the old store at `64.23.158.204`.

## Controlled launch window

1. Install the live Stripe key and signing secret, enable the Stripe provider,
   and verify the signed live webhook endpoint before exposing checkout broadly.
2. Place one small real order to a controlled
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
