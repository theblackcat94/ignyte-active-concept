-- Prepare later review-request scheduling only after delivery confirmation is integrated.
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists delivery_confirmation_source text;
create table if not exists public.review_requests (
  order_id uuid primary key references public.orders(id) on delete cascade,
  due_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.review_requests enable row level security;
revoke all on public.review_requests from public, anon, authenticated;
grant select, insert, update on public.review_requests to service_role;
