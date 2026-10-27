# IGNYTE custom storefront

A responsive Next.js concept for Ignyte Active, built in the brand's charcoal, cream and flame orange palette. It draws on the shopping patterns of activewear stores while using original layout, copy and concept imagery.

## Run locally

Requires Node.js 20.9 or newer.

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. The dev server binds to `127.0.0.1` only.

To build and run the self hosted application locally:

```powershell
npm run build
npm run start
```

The server binds to `127.0.0.1:3000`. A production host needs HTTPS and a reverse proxy.

## Existing GitHub Pages preview

The existing concept on `main` remains at `https://theblackcat94.github.io/ignyte-active-concept/`. This commerce branch uses server API routes and cannot run on GitHub Pages. Do not merge it into `main` until the new hosting and launch plan is ready.

## Build machine deployment preview

The custom site is built on `internetremovals@100.120.9.34` and deployed to the separate Linode at `172.105.186.242`. The Linode already hosts another site on port 3000; Ignyte uses its own systemd service on `127.0.0.1:3210`. The build machine and Linode both run Ubuntu 24.04, so the package includes the build machine's Node 20 executable instead of changing the Linode's system Node 18.

The build checkout is `/home/internetremovals/SERVER/NEXT/IGNYTE`. Fetch the release ref, create a clean detached temporary worktree at the exact commit, then run `bash deploy/build-and-deploy.sh <full-commit-sha>` from it. The script builds a Next.js standalone package, rejects credential-like files, transfers it over the existing build-machine SSH path, installs an isolated release, and probes the local app. The Linode's `/opt/ignyte/current` symlink supports rollback if the new release fails its health check.

For the first deployment only, transfer `deploy/ignyte.nginx.conf` to `/tmp/ignyte.nginx.conf` on the Linode and run `deploy/bootstrap-nginx.sh` there. It creates a dedicated host for `ignyte.theblackcat94.com`, requests HTTPS with Certbot, and verifies the public site. Existing NGINX hosts are left alone.

Without Supabase public settings at build time, this is a **preview** using the current concept catalogue; accounts and checkout remain unavailable. When Supabase is ready, store only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` in `/home/internetremovals/.config/ignyte/build.env` on the build machine, and rebuild. Put the same public Supabase settings and server-only secrets in `/etc/ignyte/production.env` on the Linode, readable only by root and the `ignyte` service group. Never place credentials in Git, deployment archives, command arguments, or chat.

## New store setup

1. Create a **new** Supabase project for this custom store. Run [the migration](supabase/migrations/202610270001_commerce.sql), then [the concept catalogue seed](supabase/seed.sql) in its SQL editor. The six copied products are unpublished drafts, all variants are inactive, and stock is zero. Review real sizes, SKUs, prices and stock in the admin before publishing.
2. Set the Supabase Auth site URL and allowed redirect URLs for the chosen HTTPS domain, including `/account` and `/account/reset`. Email confirmation should remain enabled. Create a team user through `/account`, then grant their role from the Supabase SQL editor with `insert into public.staff_members (user_id, role) select id, 'admin' from auth.users where email = 'team-member@example.com';`. Replace the example email. Never expose the secret key to a browser.
3. In Stripe **test mode**, create a fixed Australian shipping rate, configure a webhook for `/api/stripe/webhook` with `checkout.session.completed` and `checkout.session.expired`, and collect its signing secret. The checkout currently limits delivery to Australia and supports card payments. Product prices are treated as GST inclusive. Confirm shipping charges and tax invoice treatment before live payments.
4. Copy [.env.example](.env.example) to `.env.local` and enter the Supabase project URL and publishable key, Supabase secret key, Stripe test secret key, webhook signing secret, Stripe shipping rate ID, and the local site URL. Keep `.env.local` private; never commit or paste the secret values into chat. The checkout returns a service unavailable response until the required settings are present.
5. Run `npm install`, `npm run build`, then `npm run start`. Test account confirmation, password reset, team editing, image upload, variant stock, payment success, payment cancellation, session expiry, and order history with Stripe test payments. Configure the production host and HTTPS before replacing test keys with live keys.
6. Run `npm run reconcile:orders` on a scheduled job every few minutes on the server. It checks old pending Stripe sessions, completes paid orders, and releases stock from expired sessions. Orders with no linked Stripe session or unusual payment details require manual review; do not blindly release their stock.

Product and order data live in the new Supabase Postgres database. Account credentials are managed by Supabase Auth. Product images uploaded in the editor live in a public Supabase Storage bucket. Payment card details stay with Stripe. Server API routes validate team roles and payment webhooks before changing products or orders.

## Included

- Responsive homepage with campaign hero, category discovery, product edit, brand story, and footer
- Category routes, filtering and sorting, search, wishlist and product detail routes
- Bag and wishlist with local browser storage; account and order history with Supabase Auth
- Original AI-generated campaign and product concept imagery under `public/images`

## Before launch

- Review the copied concept catalogue in the admin. It remains unpublished until the team activates products and variants with verified stock.
- Configure Supabase, Stripe test mode and Australian shipping before testing checkout. Select a production host before launch.
- Connect newsletter signup to the approved email platform.
- Replace the concept campaign and product imagery with client-approved assets.
- Confirm shipping, returns, support, accessibility and privacy copy. Support currently links to the live contact page.
- Confirm the precise brand colour values; the current accent is `#ff4530`.

## Image provenance

The six files in `public/images` were generated for this local concept with the built-in image generation tool. No competitor images were copied. Prompt summaries:

- `campaign-hero.png`: two adult athletes in dark Ignyte-inspired activewear, dramatic charcoal studio and warm orange rim lighting, wide with left negative space.
- `campaign-studio.png`: adult athlete in espresso training set, pale concrete studio, natural editorial light.
- `campaign-training.png`: adult athlete in dark training wear, industrial gym doorway, late afternoon light.
- `product-leggings.png`: black technical leggings on a display mannequin, neutral catalog backdrop.
- `product-halter.png`: espresso halter training top on a display mannequin, neutral catalog backdrop.
- `product-shorts.png`: black technical training shorts on a display mannequin, neutral catalog backdrop.

All generated imagery is illustrative and must be reviewed before commercial use.
