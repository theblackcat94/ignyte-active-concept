create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  recipient text not null check (length(trim(recipient)) between 5 and 254),
  subject text not null,
  html_body text not null,
  text_body text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text
);

create index if not exists email_outbox_pending_idx
  on public.email_outbox(created_at) where sent_at is null;
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public, anon, authenticated;
grant select, insert, update on public.email_outbox to service_role;
