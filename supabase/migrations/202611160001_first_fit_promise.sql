-- Inactive First Fit Promise extension of the existing returns system.
-- Apply only after the shared IGNYTE database change is approved.
alter table public.return_settings
  add column if not exists first_fit_enabled boolean not null default false,
  add column if not exists first_fit_request_window_days integer check (first_fit_request_window_days between 1 and 90),
  add column if not exists first_fit_max_items integer not null default 1 check (first_fit_max_items between 1 and 10),
  add column if not exists first_fit_return_postage text not null default 'pending' check (first_fit_return_postage in ('pending','customer','ignyte')),
  add column if not exists first_fit_replacement_postage text not null default 'pending' check (first_fit_replacement_postage in ('pending','customer','ignyte'));

alter table public.return_requests
  add column if not exists request_type text not null default 'standard' check (request_type in ('standard','first_fit'));
alter table public.return_requests drop constraint if exists return_requests_requested_resolution_check;
alter table public.return_requests add constraint return_requests_requested_resolution_check
  check (requested_resolution in ('store_credit','original_payment','statutory_remedy','size_exchange'));
alter table public.return_requests add constraint return_requests_first_fit_resolution_check
  check ((request_type = 'first_fit') = coalesce(requested_resolution = 'size_exchange', false));
create index if not exists return_requests_type_idx on public.return_requests(request_type, submitted_at desc);

create table if not exists public.first_fit_exchanges (
  return_id uuid primary key references public.return_requests(id) on delete cascade,
  original_order_item_id uuid not null references public.order_items(id),
  requested_size text not null check (length(trim(requested_size)) between 1 and 60),
  replacement_variant_id uuid references public.product_variants(id),
  eligibility_status text not null default 'under_review' check (eligibility_status in ('under_review','approved','declined','requires_review')),
  eligibility_note text not null default '',
  return_postage_status text not null default 'pending' check (return_postage_status in ('pending','approved','provided','customer_paid')),
  inspection_result text not null default 'pending' check (inspection_result in ('pending','passed','failed','requires_review')),
  replacement_status text not null default 'not_started' check (replacement_status in ('not_started','processing','dispatched','completed')),
  replacement_order_reference text not null default '',
  replacement_tracking_url text not null default '',
  exchange_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists first_fit_exchanges_variant_idx on public.first_fit_exchanges(replacement_variant_id);
alter table public.first_fit_exchanges enable row level security;
revoke all on public.first_fit_exchanges from public, anon, authenticated;
grant select, insert, update on public.first_fit_exchanges to service_role;
