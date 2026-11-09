# Isolated checkout and Mintsoft test

This is a supervised test, not a scheduled job. The live exporter remains
restricted to genuine paid orders and Mintsoft client 51. The separate test
script accepts one explicitly named Stripe sandbox order, uses only Mintsoft
client 30 and warehouse 5, and never writes the live `mintsoft_order_id` field.
Daniel confirmed client 30 does not physically fulfil test orders.

## Restore staging deployment access

The staging website at `https://dev.ignyteactive.com` responds on HTTPS, but
SSH to its Lightsail instance (`54.253.19.1`) timed out on 9 November 2026.
In AWS Lightsail, open the `ignyte-staging` instance, check that it is running,
then inspect **Networking → IPv4 firewall**. Allow TCP port 22 from the build
machine's current public IP only. It was `117.20.68.14` at the last check;
verify it again from the build machine with `curl https://checkip.amazonaws.com`
before editing the rule. Confirm the instance still accepts the configured
`ignyte_lightsail_deploy` key for user `ubuntu`. Close any temporary broader
SSH rule after deployment. From the build machine, verify:

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
into test client 30. The existing `2shirtbundle` test SKU proves Mintsoft API
creation but does not match an active website SKU, so it cannot test the
checkout-to-Mintsoft path. Ask him to map the website's **Standard Australian
delivery** service to a test courier and confirm test-client `ClientEditOrder`
permission and Tracking Events support. Do not enable automatic physical
despatch.

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
