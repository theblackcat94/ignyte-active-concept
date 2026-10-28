# IGNYTE email designs

These are review drafts. They are not configured in Supabase or connected to SES, and no site event sends them yet.

| Message | Trigger | Subject | Source |
| --- | --- | --- | --- |
| Confirm account | Supabase Auth sign-up | Confirm your IGNYTE account | `auth-confirm.html` |
| Reset password | Supabase Auth recovery | Reset your IGNYTE password | `auth-reset.html` |
| Team invitation | Supabase Auth invitation | Your IGNYTE invitation | `auth-invite.html` |
| Order request received | A manual/guest order is saved | We received your IGNYTE order request | `lib/email-templates.ts` |
| Payment confirmed | A verified payment webhook marks an order paid | Your IGNYTE payment is confirmed | `lib/email-templates.ts` |
| Order dispatched | A team member records dispatch and tracking | Your IGNYTE order is on its way | `lib/email-templates.ts` |
| Enquiry received | Contact form saves a ticket | We received your IGNYTE message | `lib/email-templates.ts` |

The first three files use [Supabase Auth's documented `{{ .ConfirmationURL }}` and `{{ .SiteURL }}` variables](https://supabase.com/docs/guides/auth/auth-email-templates). The account confirmation and recovery links must be tested against the configured Site URL and redirect allow list before replacing the live Supabase templates. Supabase sends these through its own email service until a custom SMTP connection is configured. Disable link tracking in any SMTP provider used for Auth so verification links are not rewritten.

The other designs are typed renderers that return HTML and plain text. Dynamic values are HTML-escaped. They are deliberately not called by checkout or support routes. Order-request copy states that payment has not been taken; payment-confirmed mail must only follow a verified merchant callback. Dispatch mail must only follow a real fulfilment update. A guest order detail link is omitted unless it can be opened securely outside the original checkout browser.

Before sending: obtain SES production access in Sydney; grant the app a narrowly scoped send permission without committing keys; add an idempotent email outbox so retries cannot duplicate receipts; test links, rendering and delivery to multiple mail clients. Marketing campaigns and welcome email need a separate consent/unsubscribe and approval flow.

## Sending and complaint process

The Sydney SES account has verified `ignyteactive.com` and `support@ignyteactive.com` identities. Its **account-level suppression list is enabled for both bounces and complaints** (checked in the SES console on 28 October 2026). Do not remove a suppressed address merely to retry a send. The team should review SES reputation and suppression after each test batch and at least daily once live; investigate complaint or bounce spikes, stop affected sends, and correct address/data problems before resuming. Before automated sending, add bounce/complaint event publishing and a monitored alert, and keep application recipient suppression in sync with SES. Record the monitoring owner and escalation path with Jade and Marcus.
