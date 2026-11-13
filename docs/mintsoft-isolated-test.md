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
for either confirmed service when the callback has no URL. Express is not yet
offered at website checkout. The 3PL must confirm the Standard/Express mapping
is active before live order export is switched from `AUTO`.

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
- Daniel must manually mark order 150460 `DESPATCHED` without shipping a
  parcel. Check whether Mintsoft posts the dispatch callback, then obtain a
  supported test delivery event. Standard-to-AusPost API mapping is not active
  in this test client; confirm the live-client mapping before live export.

An earlier website order `81bd992c-c59b-4156-a061-9c1e98fc96ca` was
created for a sandbox checkout but expired unpaid. It was not sent to
Mintsoft.

On the build machine, place only the test API key in an owner-only
`/home/internetremovals/.config/ignyte/mintsoft-test.env`:

```text
MINTSOFT_TEST_API_KEY=<test-client-key>
MINTSOFT_CLIENT_ID=30
MINTSOFT_WAREHOUSE_ID=5
MINTSOFT_COURIER_SERVICE=AusPost
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
4. Ask Daniel to change that test order to `DESPATCHED` without shipping a
   parcel. Confirm the callback changes the website order to dispatched,
   stores the tracking number and sends one customer email. Then have him
   simulate or supply a supported courier delivery event, and verify the
   delivered status and email. If the courier cannot generate a test delivery
   event, delivery remains unverified.
5. Use the admin **CLEAN UP TEST ORDER & RETURN STOCK** control only after
   recording the test results. This is for marked Stripe sandbox orders only.

Staging currently shares Supabase with production. Use a controlled tester
account and one small order; do not run bulk tests or install the test exporter
as a timer. The live stock sync does not subtract marked test orders from
Mintsoft client-51 stock.
