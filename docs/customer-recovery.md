# Customer recovery (development rollout)

The recovery feature is **off by default**. The new tables and `recovery_consent_at` column are defined in `supabase/migrations/202611120001_customer_recovery.sql`. Only the server service role can read or write recovery data.

## Eligibility

- A customer must be signed in, have a confirmed IGNYTE newsletter subscription, and separately opt into personalised bag and product reminders in their account or at checkout.
- Older newsletter subscriptions do not acquire recovery consent automatically. Guest browsing is not linked to an email address. An authenticated and verified guest identity flow would be needed to add guests.
- Cart activity is saved after a bag change. Browse activity needs at least 20 active seconds and an intentional gallery, size, colour, guide or fit interaction. The on-site size-guide prompt is once per session and can be dismissed.
- A paid order, unsubscribe, empty bag or unavailable item suppresses cart delivery. Cart takes priority over browse. The browse email is not implemented for sending because its separately approved copy was not supplied.
- Recovery records older than 90 days are removed by the worker when it runs.

## Release switches

1. Review and apply the migration to the target Supabase database.
2. Deploy the site. Confirm `/admin/recovery/` can load; all three capture toggles remain off.
3. Enable the cart and optional browse capture toggles only for a controlled test. This **does not** enable email delivery.
4. Inspect both cart email previews and run the admin dry-run check. Test consent, opt-out, purchase, unavailable stock, restore, and a second cart cycle. Confirm rendered layouts on mobile.
5. Only after approval, configure `RECOVERY_CRON_SECRET`, set `RECOVERY_EMAIL_DELIVERY_ENABLED=true` on the intended environment, and schedule an authenticated POST to `/api/recovery/run/` at a suitable interval (for example, every 15 minutes). Confirm SES credentials, monitoring and delivery logs.

The scheduler has two gates: a secret header and the environment delivery switch. The admin page cannot send customer email. A unique delivery stage claim prevents duplicate sends. A failed stage is retained for review and is not retried automatically.

The restore link expires after seven days. It reveals only currently available bag items; current prices and stock are checked again during shopping and checkout. It does not silently replace items already in the customer's bag.

The admin report currently covers captures, suppression, sends and bag restoration. Open rates are deliberately omitted because email image loading is unreliable; paid-order attribution needs a separate, reviewed measurement rule.
