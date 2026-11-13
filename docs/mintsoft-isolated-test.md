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

Ask Daniel to copy at least one **active website SKU** and sufficient quantity
into test client 30. On 10 November, none of its 14 test SKUs matched the 48
active website SKUs. An attempted isolated test order for website SKU
`IGN-LVR-SHTS-JAC-L` returned Mintsoft's `Cannot find Product with SKU` and
created no order. The dry-run guard now rejects that SKU before any API write.
The existing `2shirtbundle` test SKU proves Mintsoft API creation but does not
match an active website SKU. Ask Daniel to map the website's **Standard Australian
delivery** service to a test courier and confirm test-client `ClientEditOrder`
permission and Tracking Events support. Do not enable automatic physical
despatch.

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

A second website order `81bd992c-c59b-4156-a061-9c1e98fc96ca` was created
for a fresh sandbox checkout but remains unpaid and must not be sent to
Mintsoft. Its Stripe session was still open when checked. The user stopped
browser automation before payment; resume only on a new explicit request.

On the build machine, place only the test API key in an owner-only
`/home/internetremovals/.config/ignyte/mintsoft-test.env`:

```text
MINTSOFT_TEST_API_KEY=<test-client-key>
MINTSOFT_CLIENT_ID=30
MINTSOFT_WAREHOUSE_ID=5
MINTSOFT_COURIER_SERVICE=AUTO
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
