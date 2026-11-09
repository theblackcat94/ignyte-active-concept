# Mintsoft shipping and stock integration

## Shipping callbacks implemented in this checkout

The website now has authenticated endpoints at `/api/mintsoft/shipping/dispatched`
and `/api/mintsoft/shipping/delivered`. It matches a callback's `SourceOrderId`
(or UUID `OrderNumber`/`ExternalOrderReference`) to the website order UUID. It
records carrier, tracking number, HTTPS tracking URL, and dispatch/delivery dates
separately from payment state. The customer and staff order pages display those
fields. Confirmed paid orders queue one dispatch or delivery email per event via
the existing SES outbox; retries do not queue duplicate emails. `delivered_at`
is available as the future review-request trigger. No review email is sent yet.

Apply `supabase/migrations/202611030001_mintsoft_tracking.sql` before deploying
the site changes. Configure a new server-only `MINTSOFT_WEBHOOK_SECRET` of at
least 32 random characters and make Mintsoft send `Authorization: Bearer
<secret>` through ConnectAction `ExtraCode4`. Do not use the Mintsoft API key as
the callback secret or put it in a URL. Use the deployed HTTPS site URL in
`ExtraCode1` (dispatched) and `ExtraCode3` (delivered). Set `SourceOrderId` to
the website order UUID. Mintsoft supports setting these in the original order
creation call or through `/api/Order/{id}/ConnectActions`.

The paid-order exporter at `scripts/send-mintsoft-orders.mjs` sends genuine paid,
stock-reserved website orders to Mintsoft through `PUT /api/Order`. It skips
unpaid and sandbox/test orders, uses the website UUID as both order references,
checks Mintsoft's `GetOrderId` before creation, and stores the returned Mintsoft
ID. Run `npm run send:mintsoft-orders` for a read-only dry run or pass `-- --apply`
to submit. The user-level `deploy/ignyte-mintsoft-orders.timer` runs it every
minute. Mintsoft's uniqueness rule and the lookup protect against duplicate
fulfilment after a retry. A failed export leaves the website reservation in
place and requires investigating the service journal. The timer was enabled on
the build machine on 4 November 2026; its first run found no genuine paid
orders waiting for export. A live order has not yet tested the create permission,
3PL allocation, or courier selection.

The shipping callback endpoints are not yet deployed or registered as
ConnectActions on new orders. Do not activate
customer shipment emails until a tracked test order proves the reference,
payload, callback authentication, and courier tracking end to end. The one
visible Mintsoft order at the last portal check was a manual pickup, not a
tracked website order. Delivered callbacks additionally require Mintsoft's
Tracking Events module and a supported courier.

## Mintsoft stock reconciliation

The portal shows warehouse **BIGGERA WATERS** (warehouse ID `5`) and client ID
`51`. All 48 active website SKUs match Mintsoft SKUs; 45 displayed website
quantities differed at the 3 November 2026 check. On 4 November, the full API
snapshot returned 184 SKUs and all 48 active website variants were updated.
The 13 inactive website placeholder SKUs have no Mintsoft match and are left
alone. The script uses Mintsoft `GET /api/Product/StockLevels`, whose `Level`
is on-hand stock.

Apply `supabase/migrations/202611030003_mintsoft_stock.sql` in Supabase. Set
server-only `MINTSOFT_API_KEY`, `MINTSOFT_WAREHOUSE_ID=5`, and
`MINTSOFT_CLIENT_ID=51` in an owner-only build-machine
`/home/internetremovals/.config/ignyte/mintsoft.env`. On 4 November 2026 the
3PL admin confirmed the supplied key had been made non-expiring, and a live
warehouse/client-scoped request returned HTTP 200. Do not place the key in Git,
chat, a URL, or a public Next.js variable.

Run `npm run sync:mintsoft-stock` to compare without writing. Run
`npm run sync:mintsoft-stock -- --apply` to update Supabase. The full snapshot
must contain every active website SKU; wrong client/warehouse, missing SKUs,
duplicates, negative levels, and API errors abort the entire update. The
database stores Mintsoft's raw level and sync timestamp separately. Sellable
`stock_on_hand` is `max(0, Mintsoft Level - website-only reserved units)` so
an order awaiting payment on the website cannot be sold twice. Once Mintsoft
acknowledges a paid order, its returned ID is saved in `orders.mintsoft_order_id`;
Mintsoft's available OnHand quantity then accounts for its own allocation.

After a successful dry run and live reconciliation, place the script and its
`lib/mintsoft-stock.mjs` helper in the owner-only stable
`~/.local/share/ignyte-stock-runtime`, with its `node_modules` pointing to the
build checkout's installed dependencies. Install
`deploy/ignyte-mintsoft-stock.service` and `.timer` in
`~/.config/systemd/user/` on the build machine, then run
`systemctl --user daemon-reload`,
`systemctl --user enable --now ignyte-mintsoft-stock.timer`, and
`systemctl --user start ignyte-mintsoft-stock.service` for the first run. Check
`systemctl --user status ignyte-mintsoft-stock.service` and its journal on failures.
This user timer was installed and enabled on the build machine on 4 November
2026. A supervised run and the first automatic run at 06:20 AEST both completed
successfully; Supabase showed 48/48 active variants stamped at 06:20 AEST. The job uses a full
snapshot every time, so a missing or failed run never silently zeroes stock.
Verify that the timer continues firing and the `mintsoft_synced_at` timestamps
advance.
The website reads `stock_on_hand` from Supabase; no extra storefront polling is
needed. Admin stock edits can be overwritten on the next sync.

Official references: [order webhooks](https://help-mintsoft.theaccessgroup.com/en/articles/11694811-api-set-up-order-webhooks),
[stock levels](https://help-mintsoft.theaccessgroup.com/en/articles/11694802-api-view-stock-levels),
[tracking support](https://help-mintsoft.theaccessgroup.com/en/articles/11680907-view-tracking-events-from-your-courier).

## End-to-end testing and handoff

Mintsoft does not offer a customer API sandbox. Its documented 3PL testing
method is a separate test client with a separate client user and API key, test
products, and test orders. Fulfilpackers must create and isolate that client;
the Ignyte client (51) and its current API key are live. Mintsoft's client
`TestMode - Auto Print and Despatch Orders` setting is for webhook tests and
automatically prints and despatches orders; do not enable it on live client 51.

Before calling the integration end-to-end verified, check the website reservation
handoff, courier mapping, shipping callbacks, and failure recovery. Coordinate one marked
live order with Fulfilpackers before production traffic relies on the feed.
Confirm courier mapping and Tracking Events support, deploy the shipping
callback routes with a separate callback secret, register ConnectActions, and
verify dispatch and delivery callbacks, email deduplication, and the review
trigger. The minute order-export timer currently logs failures to the user
systemd journal; add an operational failure alert before treating the flow as
unattended.

Official test references: [test environment](https://help-mintsoft.theaccessgroup.com/en/articles/11647025-api-set-up-a-test-environment),
[TestMode behaviour](https://help-mintsoft.theaccessgroup.com/en/articles/11603320-testmode-auto-print-and-despatch-orders).

On 6 November 2026, Daniel advised that the isolated test client is ID 20 and
provided a separate test API key. Read-only API checks showed the key works for
warehouse listings, but `GET /api/Product/StockLevels?WarehouseId=5` returned
only client ID 30 products (14 rows). Filtering to client 30 returned 200;
filtering to client 20 returned 403. No test order was created. Confirm the
correct test client ID and key assignment with Fulfilpackers, and obtain their
confirmation that test-client orders will not enter physical fulfilment before
running a write test. Do not copy the test key into this repository or the live
stock/order-export runtime.

Rechecked on 9 November 2026: the same test key still returns HTTP 403 for
client 20 and HTTP 200 for client 30 (14 stock rows). Do not create a test order
until Fulfilpackers confirms the intended client and isolation. The live stock
and paid-order timers were active; the stock run fetched 184 Mintsoft rows and
matched all 48 active website SKUs, while the order run found zero paid orders
awaiting export. Both jobs briefly failed during an early morning DNS outage
affecting Mintsoft and Supabase lookups; subsequent runs succeeded, and there
were no job errors after 07:00 AEST on 9 November.

Later on 9 November, Daniel corrected the test client ID to **30** and confirmed
that its orders will not be processed. A single isolated API order was created
in client 30, warehouse 5, with SKU `2shirtbundle`, quantity 1, and order
reference `ba8561fb-282d-4be3-bb10-231e0a3b692e`. Mintsoft returned HTTP
200, `Success=true`, order ID **146366**, and status `NEW`. `GetOrderId` and
`GET /api/Order/146366` returned the same order, client, warehouse, and SKU.
Available test stock fell from 5 to 4. Resending the identical reference
returned HTTP 200 with `Success=false` and `Order Number already exists!`;
lookup still returned 146366 and stock remained 4. No live client-51 order or
stock was changed by this test. This proves API create/read, test allocation,
and Mintsoft duplicate rejection. It does not yet prove the website-to-Supabase
paid-order handoff or dispatch/delivery callbacks. The test order had no
selected courier service (`CourierServiceId=0`), so courier mapping needs a
separate check before tracking notifications can be verified.

Daniel confirmed the test order is visible in the Mintsoft test client with one
unit of `2shirtbundle` allocated. He advised that Mintsoft can push tracking
details when an order moves to `DESPATCHED` and that no courier service is
selected because shipping service names (such as Standard/Express) have not
been mapped. The current website checkout offers one standard Australian
delivery service, with a free-shipping price variant; it does not offer Express.
On 9 November, unsigned POST probes to both
`https://ignyteactive.com/api/mintsoft/shipping/dispatched` and the matching
`https://dev.ignyteactive.com` path returned 404. The test order was submitted
without a ConnectAction. Therefore Daniel's despatch step cannot yet update
the website or trigger a shipment email. Deploy the authenticated callback
route, configure its separate secret, add ConnectAction URLs and the website
order UUID during order creation, confirm client-user `ClientEditOrder`
permission, agree the Standard service mapping, and perform a tracked despatch
test. Delivered callbacks still depend on the courier and Mintsoft Tracking
Events module.
