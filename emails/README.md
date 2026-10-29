# IGNYTE email designs

The site delegates account creation to Supabase Auth and offers a confirmation resend action when Auth requires email verification. Account confirmation, password reset and team invitations still use Supabase Auth's configured email service. Order request receipts, payment confirmations and support order alerts are wired to the SES sender through a Supabase outbox; the outbox migration and server configuration below must be in place before delivery can work.

| Message | Trigger | Subject | Source |
| --- | --- | --- | --- |
| Confirm account | Supabase Auth sign-up | Confirm your IGNYTE account | `auth-confirm.html` |
| Reset password | Supabase Auth recovery | Reset your IGNYTE password | `auth-reset.html` |
| Team invitation | Supabase Auth invitation | Your IGNYTE invitation | `auth-invite.html` |
| Order request received | A manual/guest order is saved | We received your IGNYTE order request | `lib/email-templates.ts` |
| Payment confirmed | A verified payment webhook marks an order paid | Your IGNYTE payment is confirmed | `lib/email-templates.ts` |
| Order dispatched | A team member records dispatch and tracking | Your IGNYTE order is on its way | `lib/email-templates.ts` |
| Enquiry received | Contact form saves a ticket | We received your IGNYTE message | `lib/email-templates.ts` |

The first three files use Supabase Auth's `{{ .ConfirmationURL }}` and `{{ .SiteURL }}` variables. Install `auth-confirm.html` as the **Confirm signup** HTML in Supabase Dashboard → Authentication → Email Templates, with subject `Confirm your IGNYTE account`. The account confirmation and recovery links must be tested against the configured Site URL and redirect allow list for **both** `https://ignyte.theblackcat94.com/account` and `https://dev.ignyteactive.com/account` before replacing the live Supabase templates. Supabase sends these through its own email service until a custom SMTP connection is configured. Disable link tracking in any SMTP provider used for Auth so verification links are not rewritten.

The other designs are typed renderers that return HTML and plain text. Dynamic values are HTML-escaped. Order-request copy states that payment has not been taken; payment-confirmed mail follows a verified eWAY or Stripe callback. The unique outbox event key prevents routine webhook retries from sending duplicate receipts. An admin-only retry endpoint processes queued messages from Admin → Orders. Dispatch and enquiry templates are not yet connected to a send event.

Before delivery: apply `supabase/migrations/202610290002_order_email_outbox.sql`; configure `SES_AWS_ACCESS_KEY_ID`, `SES_AWS_SECRET_ACCESS_KEY`, `SES_AWS_REGION`, `SES_FROM_EMAIL` and `ORDER_NOTIFICATION_EMAIL` in the protected build environment file; verify the SES identity and production sending access in Sydney; then send and review test orders. Do not commit credentials or paste them into chat. `SES_AWS_SESSION_TOKEN` is optional for temporary credentials. Marketing campaigns and welcome email need a separate consent/unsubscribe and approval flow.

## Sending and complaint process

The Sydney SES account has verified `ignyteactive.com` and `support@ignyteactive.com` identities. Its **account-level suppression list is enabled for both bounces and complaints** (checked in the SES console on 28 October 2026). Do not remove a suppressed address merely to retry a send. The team should review SES reputation and suppression after each test batch and at least daily once live; investigate complaint or bounce spikes, stop affected sends, and correct address/data problems before resuming. Before automated sending, add bounce/complaint event publishing and a monitored alert, and keep application recipient suppression in sync with SES. Record the monitoring owner and escalation path with Jade and Marcus.
