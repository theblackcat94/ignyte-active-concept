# Isolated checkout and Mintsoft test

This is a supervised test, not a scheduled job. The live exporter remains
restricted to genuine paid orders and Mintsoft client 51. The separate test
script accepts one explicitly named Stripe sandbox order, uses only Mintsoft
client 30 and warehouse 5, and never writes the live `mintsoft_order_id` field.
Daniel confirmed client 30 does not physically fulfil test orders.

## Restore staging deployment access

On 10 November 2026, staging was deployed at commit
`8772f3c465b38edfe86c90816324f8db04510d92`. SSH had timed out because
the Lightsail firewall allowed `117.20.68.72/32`, while the build machine was
using `117.20.68.14/32`. The second address was added to the existing TCP 22
rule, preserving the first and Lightsail browser SSH. The instance was healthy.
Its 58 GB disk was then found full of 162 release directories; with explicit
authorization, 158 obsolete releases were removed while keeping the running
release and three rollback copies. The deployment completed and the public
callback returned 401 unsigned and 400 for signed invalid JSON.

If SSH fails again, open the `ignyte-staging` instance in AWS Lightsail and
inspect **Networking → IPv4 firewall**. Verify the build machine's current
public IP with `curl https://checkip.amazonaws.com` before editing TCP port 22.
Confirm the configured `ignyte_lightsail_deploy` key for user `ubuntu`. From
the build machine, verify:

```bash
ssh -i ~/.ssh/ignyte_lightsail_deploy -o BatchMode=yes -o ConnectTimeout=8 ubuntu@54.253.19.1 'echo connected'
```

Deploy the exact pushed commit from a clean, detached build-machine worktree:

```bash
BUILD_ENV_FILE=/home/internetremovals/.config/ignyte/staging.env \
DEPLOY_SSH_TARGET=ubuntu@54.253.19.1 \
DEPLOY_SSH_IDENTITY=/home/internetremovals/.ssh/ignyte_lightsail_deploy \
DEPLOY_REMOTE_PREFIX=sudo \
bash deploy/build-and-deploy.sh <full-commit-sha>
```

An unsigned POST to `/api/mintsoft/shipping/dispatched/` should return 401.

## Prepare the isolated Mintsoft client

The test API user created active website SKU `IGN-LVR-SHTS-JAC-L` as product
`27521` in client 30 on 12 November. A stock movement attempt returned HTTP
200 with `Success: false` and `Only Admin Users can perform stock movements!`.
Daniel booked five test units into warehouse 5 on 13 November; the API
confirmed `Level: 5`. The product uses a placeholder 1 kg weight and must not
be treated as production product data. Do not alter live client 51 stock.
The existing `2shirtbundle` test SKU does not match an active website SKU.
The test client's **Standard Australian delivery** service still needs a
proper courier mapping, and Tracking Events support still needs confirmation.
Do not enable automatic physical despatch.

## Test result on 13 November 2026

- An existing paid, reserved Stripe sandbox order
  `5c7052c0-5970-4ac9-bc30-c0faedf40083` passed the guarded dry run and
  Mintsoft client 30 accepted it as order `150174`. Its exact SKU and one unit
  were verified with order GET. Available test stock fell to four; total stock
  remained five.
- Mintsoft initially rejected `MarkDespatched` because no courier service was
  selected. `CLIENT-PICKUP` service `2071` was assigned to this test order only;
  `MarkDespatched` then succeeded with synthetic tracking number
  `IGNYTE-TEST-150174`. No physical shipment was created.
- Mintsoft's connect action remained `Complete: false`, and the staging access
  log showed no Mintsoft-originated dispatch callback. Staging had meanwhile
  been deployed from branch `codex/bag-size-guide-refresh` at `024fc393`,
  whose build lacked the Mintsoft callback route. The staging branch and
  commerce integration were merged, tested, and deployed at `da3b4166`.
- After restoring the route, a signed replay of Mintsoft's dispatched order
  JSON returned HTTP 200, updated the website order to `dispatched`, stored
  the test carrier/tracking number, and sent the test dispatch email once.
  A separately approved simulated delivered callback returned HTTP 200,
  updated the order to `delivered`, and sent the test delivery email once.
  These replays verify the website callback and mail path; they do **not**
  prove Mintsoft automatically sent either callback or that a courier supplied
  a real delivery event.
- Before launch, have the 3PL confirm why the connect action did not run on
  the manually dispatched test order, map Standard/Express services, and
  demonstrate a supported courier delivery event with the Tracking Events
  module. The live payment domain remains undecided.

On 13 November, Daniel advised that manual despatch is needed to test the
Mintsoft-originated connect action. He identified Standard as `AusPost`
(service ID `2058`) and Express as `3J55 - EXPRESS POST` (service ID `2057`),
with mapping handled by the 3PL. The supplied 14-row courier CSV includes
the Express service and its Australia Post URL template
`https://auspost.com.au/mypost/track/#/details/{0}`, but no `AusPost` row.
The Mintsoft API confirms service `2058` is active with no TrackingURL and
service `2057` is active with that template. The website now formats templates
with the tracking number and uses the same Australia Post URL as a fallback
for either confirmed service when the callback has no URL. Express is not
offered at website checkout.

### Fresh paid website order, 13 November 2026

- Stripe sandbox accepted A$85 for one `IGN-LVR-SHTS-JAC-L` order
  `f3c138dd-1869-4fa3-9445-7f056217bac7` (A$70 item plus A$15 Standard
  shipping). The guarded exporter confirmed it was paid, stock reserved and
  eligible for isolated client 30. This checkout was opened outside the
  browser session that held its guest-order cookie, so the success page could
  not load the order even though Stripe payment and webhook processing worked.
- The client-30 order API rejected `CourierService: Standard` with
  `Unable to Find CourierService: Standard or a Mapping to API`. A retry with
  the active `AusPost` service succeeded as Mintsoft order **150460**. GET
  verified client 30, warehouse 5, courier service ID 2058, and one unit of
  the exact SKU. GET ConnectActions verified the staging dispatch and delivery
  URLs, the website order reference, and `Complete: false`.
- Daniel manually marked order 150460 `DESPATCHED` on 13 November. Mintsoft's
  callback arrived at 15:51:38 Brisbane time with synthetic tracking number
  `TRACKING123`; its ConnectAction became `Complete: true`. The website order
  became `dispatched` and the SES outbox recorded one dispatch email to the
  tester as sent at 15:51:39, with no reported error. Mintsoft's `P - Own
  Package` test courier (ID 2029) returned an Aramex tracking URL for the
  synthetic number; this is not proof of a valid customer tracking link or a
  real courier event.
- A supported courier delivery event remains untested. The current website
  offers Standard Australian delivery only; Express is not implemented at
  checkout.

On 16 November, both client logins were used to create `API` / `Standard` to
`AusPost` (service 2058) courier mappings: test client 30 mapping 67 and live
client 51 mapping 68. A separate API-only test order
`IGNYTE-STANDARD-MAP-20261116-1` was accepted in client 30 as order 152716;
GET confirmed courier service 2058, warehouse 5 and one exact-SKU unit. This
order has no website payment or callback and must not be treated as an end to
end checkout test. The live scheduled exporter runtime on the build host was
updated from `AUTO` to `Standard`, with rollback copies retained. Its timer is
active; dry run and service invocation found zero paid live orders waiting.
The customer-facing Stripe labels remain `Standard Australian delivery` and
`Free Australian delivery`, both using the same `Standard` API term. Express
is not offered and has no mapping.
Mintsoft's Aramex URL on the synthetic `P - Own Package` test order proves the
despatch webhook carried a URL; it does not prove that Tracking Events or the
delivered webhook works with a courier.

An earlier website order `81bd992c-c59b-4156-a061-9c1e98fc96ca` was
created for a sandbox checkout but expired unpaid. It was not sent to
Mintsoft.

## Checkout and despatch retest on 16 November 2026

- A Stripe sandbox checkout for one `IGN-LVR-SHTS-JAC-L` item paid A$85
  (A$70 item plus A$15 Standard shipping). Stripe's genuine webhook returned
  HTTP 200 and website order `5e0cdcd6-da32-44fc-8599-ef476179401d`
  became paid. The guarded test exporter passed its dry run and Mintsoft
  client 30 accepted it as order `152756`, with warehouse 5 and one exact-SKU
  unit. This test cannot charge real money or trigger physical fulfilment.
- The build host's isolated test configuration still said `AUTO`, overriding
  the `Standard` script default. It was corrected to `Standard` after this
  order had exported. The test order's courier was then set manually to
  `AusPost` (2058); therefore this particular checkout does not prove
  automatic courier assignment. The separate API order `152716` above does.
- Mintsoft's `MarkDespatched` API succeeded for order `152756` with synthetic
  tracking number `IGNYTE-TEST-152756`. Its first ConnectAction (148386)
  reached staging at 01:44:56 UTC, but returned HTTP 404 because a concurrent
  deployment temporarily removed the callback route. Mintsoft marked that
  action complete despite the error. The merged callback release
  `b9d31b68522a016db2efaab1c54e80895795d0a8` was restored; an unsigned
  request returned the expected HTTP 401. Replacement ConnectAction 148387
  returned HTTP 200 at 01:54:55 UTC. The website became `dispatched`, stored
  the tracking number and generated its AusPost link. The dispatch email was
  recorded as sent. Mintsoft's payload had `CourierServiceId: 2058` but a
  null `CourierServiceName`; the parser now derives the known service name
  from that ID for subsequent callbacks.
- A separately simulated delivered POST returned HTTP 200. The website became
  `delivered`, and the delivered email was recorded as sent. This proves the
  website's delivered callback and email path; it does not prove a real
  courier delivery event. The marked website test order was then cleaned up:
  status `cancelled`, `stock_reserved: false` and reserved website stock
  returned. The isolated Mintsoft test order remains as an audit record.
- An earlier A$160 Stripe sandbox checkout was initially stuck awaiting
  payment when the old staging release returned HTTP 500 to Stripe's webhook.
  After restoring the current webhook code, the verified paid session was
  replayed, then the order was cleaned up. It could not export because client
  30 lacks those three SKUs. This is why the stocked, single-SKU retest above
  was required.

## Automatic Standard shipping retest on 16 November 2026

- A fresh Stripe sandbox payment of A$85 for one `IGN-LVR-SHTS-JAC-L` item
  created website order `615ee484-7595-435a-a57e-b2ed869fc2a9` as paid and
  stock reserved. Checkout charged A$15 for Standard Australian delivery.
  The genuine Stripe webhook returned HTTP 200, and the payment and order
  request emails were recorded as sent.
- The isolated exporter dry run passed, and its apply run created Mintsoft
  client-30 order **152818** with one exact-SKU unit in warehouse 5. Mintsoft
  automatically assigned **AusPost service 2058** from the `Standard` shipping
  term; no courier edit was made. An immediate repeated exporter call exposed
  a bug: it checked remaining stock before looking up the already-created
  order, so it failed when test stock was exhausted. The exporter now checks
  for the existing order first. The repeated call then returned order 152818
  without creating another order.
- Mintsoft `MarkDespatched` succeeded with synthetic tracking
  `IGNYTE-TEST-152818`. Mintsoft's own ConnectAction 148447 returned HTTP 200
  to staging. The website became `dispatched` with carrier `AusPost`, the
  tracking number, and its AusPost link; the dispatch email was recorded as
  sent. A signed duplicate callback returned `changed: false`, and there was
  still exactly one sent dispatch email record.
- The live client-51 stock dry run covered all 48 active website SKUs with
  zero raw-level differences. The live stock and order-export timers were
  completing successfully. After cleaning up the marked sandbox order, the
  website briefly showed 52 units for the tested SKU while Mintsoft held 51:
  a stock sync during the test had already ignored the sandbox reservation,
  and the old cleanup function added another unit. Applying the authoritative
  client-51 snapshot restored **51 website / 51 Mintsoft**. Migration
  `202611160001_sandbox_stock_cleanup.sql` was applied to the matching Ignyte
  Supabase project. A readback confirmed the function is snapshot aware,
  executable by `service_role` and not executable by `anon`. A rollback-only
  database check ran the new cleanup function against the already marked test
  order and asserted it kept stock at the Mintsoft level; after rollback the
  order remained cancelled and website/Mintsoft stock remained 51/51.
- This proves the website-to-Mintsoft Standard order, genuine despatch
  callback, tracking and dispatch email. A real courier-originated delivered
  event remains unverified; the prior delivered test was a simulation.

On the build machine, place only the test API key in an owner-only
`/home/internetremovals/.config/ignyte/mintsoft-test.env`:

```text
MINTSOFT_TEST_API_KEY=<test-client-key>
MINTSOFT_CLIENT_ID=30
MINTSOFT_WAREHOUSE_ID=5
MINTSOFT_COURIER_SERVICE=Standard
```

Keep this file mode `0600`; do not copy the live Mintsoft key into it.

## Run one checkout and test export

1. On staging, buy the matching SKU using Stripe's sandbox and a controlled
   tester email/address. Confirm the order is `paid`, `stock_reserved=true`,
   and `shipping_details.test_order=true` in the admin Orders view. The
   sandbox webhook must acknowledge the completed session first.
2. From a clean checkout of this commit on the build machine, run the dry run
   with both private env files loaded. It checks that the order is a paid,
   reserved Stripe test order and that every SKU has client-30 test stock:

   ```bash
   set -a
   . /home/internetremovals/.config/ignyte/staging.env
   . /home/internetremovals/.config/ignyte/mintsoft-test.env
   set +a
   node scripts/send-mintsoft-test-order.mjs --order <website-order-uuid>
   ```

3. After checking the dry-run output, repeat the command with `--apply`.
   Record the returned Mintsoft test order ID. The script looks up the website
   UUID before creating an order, so a retry does not create a duplicate.
4. For a test order with an assigned courier service, use Mintsoft's
   `MarkDespatched` API with a clearly synthetic tracking number, or ask
   Daniel to mark it `DESPATCHED` without shipping a parcel. Confirm the
   ConnectAction returns HTTP 2xx, changes the website order to dispatched,
   stores the tracking number and sends one customer email. A completed
   ConnectAction can still contain an HTTP error, so inspect its message and
   the website state. Then obtain a supported courier delivery event and
   verify the delivered status and email. A locally simulated delivered
   callback checks only the website path; it cannot verify courier delivery.
5. Use the admin **CLEAN UP TEST ORDER & RETURN STOCK** control only after
   recording the test results. This is for marked Stripe sandbox orders only.

Staging currently shares Supabase with production. Use a controlled tester
account and one small order; do not run bulk tests or install the test exporter
as a timer. The live stock sync does not subtract marked test orders from
Mintsoft client-51 stock.
