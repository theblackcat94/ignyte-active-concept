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

The custom site is built on `internetremovals@100.120.9.34` and deployed to the separate Linode at `172.105.186.242`. The Linode already hosts another site on port 3000; Ignyte uses its own systemd service on `127.0.0.1:3210`. The build machine and Linode both run Ubuntu 24.04. Run `bash deploy/install-build-node.sh` once on the build machine to install a checksum-verified, app-only Node 22.23.4 binary. The deployment package includes that binary instead of changing either server's system Node.

The build checkout is `/home/internetremovals/SERVER/NEXT/IGNYTE`. Fetch the release ref, create a clean detached temporary worktree at the exact commit, then run `bash deploy/build-and-deploy.sh <full-commit-sha>` from it. The script builds a Next.js standalone package, rejects credential-like files, transfers it over the existing build-machine SSH path, installs an isolated release, and probes the local app. The Linode's `/opt/ignyte/current` symlink supports rollback if the new release fails its health check.

For the first deployment only, transfer `deploy/ignyte.nginx.conf` to `/tmp/ignyte.nginx.conf` on the Linode and run `deploy/bootstrap-nginx.sh` there. It creates a dedicated host for `ignyte.theblackcat94.com`, requests HTTPS with Certbot, and verifies the public site. Existing NGINX hosts are left alone.

Without Supabase settings at build time, this is a **preview** using the current concept catalogue; accounts and order submission remain unavailable. The build machine uses one owner-only `/home/internetremovals/.config/ignyte/build.env` file. Deployment exports only its public values to the Next.js build, then streams the complete file over SSH to `/etc/ignyte/production.env` on the Linode. The server-only key never enters the build environment or deployment archive. The publishable key must be present during the build to enable browser accounts. Never place credentials in Git, deployment archives, command arguments, or chat.

The project URL is `https://pyoskepqciqhnpgujtbs.supabase.co`. Get the **publishable key** and **secret/service role key** from Supabase Project Settings → API Keys. Create the build file on the build machine with `mkdir -p /home/internetremovals/.config/ignyte`, `umask 077`, then `nano /home/internetremovals/.config/ignyte/build.env`. It should contain exactly:

```text
NEXT_PUBLIC_SUPABASE_URL=https://pyoskepqciqhnpgujtbs.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SECRET_KEY=<secret key>
NEXT_PUBLIC_SITE_URL=https://ignyte.theblackcat94.com
```

The deployment script sets this file to mode `600` before use and installs the Linode copy as `root:ignyte` mode `640`, with rollback if the app fails its health check. Run [the initial migration](supabase/migrations/202610270001_commerce.sql), [the unpaid order migration](supabase/migrations/202610270002_unpaid_orders.sql), and [the seed](supabase/seed.sql) in that order in the Supabase SQL Editor. Keep the seed's products as drafts with zero stock until real stock and pricing are verified. After the file and schema are ready, redeploy the exact commit from a clean build-machine worktree and test account confirmation and an order request with verified inventory. Do not send keys or the database password through chat.

## New store setup

1. Use the new Supabase project for this custom store. Run [the initial migration](supabase/migrations/202610270001_commerce.sql), [the unpaid order migration](supabase/migrations/202610270002_unpaid_orders.sql), then [the concept catalogue seed](supabase/seed.sql) in its SQL editor. The six copied products are unpublished drafts, all variants are inactive, and stock is zero. Review real sizes, SKUs, prices and stock in the admin before publishing.
2. Set the Supabase Auth site URL and allowed redirect URLs for the chosen HTTPS domain, including `/account` and `/account/reset`. Email confirmation should remain enabled. Create a team user through `/account`, then grant their role from the Supabase SQL editor with `insert into public.staff_members (user_id, role) select id, 'admin' from auth.users where email = 'team-member@example.com';`. Replace the example email. Never expose the secret key to a browser.
3. The `/checkout` page accepts an Australian delivery address and saves an **awaiting payment order request** without charging the customer. The customer sees a confirmation and account order history; staff can review it under `/admin/orders`. An admin can cancel an unpaid order and return reserved stock. Shipping is quoted separately. Email notifications are not wired yet, so staff must check the order list and contact the customer manually. Never fulfill an order until payment and shipping are confirmed outside this flow.
4. Stripe remains optional for a later card-payment launch. Its existing `/api/checkout` and webhook integration requires a test secret key, webhook signing secret, Australian shipping rate ID, and end-to-end test payments before it is used. The bag currently uses the unpaid order request flow.
5. Copy [.env.example](.env.example) to `.env.local` for local work and enter the Supabase project URL, publishable key, secret key, and local site URL. Keep `.env.local` private; never commit or paste the secret values into chat. Run `npm install`, `npm run build`, then `npm run start`. Test account confirmation, password reset, team editing, image upload, stock reservation, duplicate submission, cancellation, and order history.
6. Run `npm run reconcile:orders` on a scheduled job every few minutes on the server. It checks old pending Stripe sessions, completes paid orders, and releases stock from expired sessions. Orders with no linked Stripe session or unusual payment details require manual review; do not blindly release their stock.

Product and order data live in the new Supabase Postgres database. Account credentials are managed by Supabase Auth. Product images uploaded in the editor live in a public Supabase Storage bucket. Payment card details stay with Stripe. Server API routes validate team roles and payment webhooks before changing products or orders.

## Included

- Responsive homepage with campaign hero, category discovery, product edit, brand story, and footer
- Category routes, filtering and sorting, search, wishlist and product detail routes
- Bag and wishlist with local browser storage; account and order history with Supabase Auth
- Original AI-generated campaign and product concept imagery under `public/images`

## Before launch

- Review the copied concept catalogue in the admin. It remains unpublished until the team activates products and variants with verified stock.
- Configure Supabase and verified inventory before testing order requests. Add Australian shipping rates, email notifications, and tested payment collection before fulfilling orders.
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
