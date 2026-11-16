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
  order_id uuid not null unique references public.orders(id),
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

-- One transaction creates the return, exchange and history, so a failed child
-- insert cannot leave an orphaned return. Only the server service role may call it.
create or replace function public.submit_first_fit_request(
  p_client_request_id uuid, p_order_id uuid, p_order_item_id uuid,
  p_requested_size text, p_reason text, p_comments text
) returns table(return_id uuid, return_reference text)
language plpgsql security invoker set search_path = '' as $$
declare
  customer_order public.orders%rowtype;
  purchased public.order_items%rowtype;
  original_variant public.product_variants%rowtype;
  replacement public.product_variants%rowtype;
  rules public.return_settings%rowtype;
  first_order_id uuid;
  request_id uuid;
  request_reference text;
begin
  select * into rules from public.return_settings where id = true;
  if not found or not rules.first_fit_enabled or rules.first_fit_request_window_days is null
    or rules.first_fit_return_postage = 'pending' or rules.first_fit_replacement_postage = 'pending'
    then raise exception 'First Fit Promise is not active'; end if;
  if length(trim(p_reason)) < 5 or length(trim(p_reason)) > 1000 or length(coalesce(p_comments,'')) > 3000
    then raise exception 'Please describe the sizing issue'; end if;
  select * into customer_order from public.orders where id = p_order_id for update;
  if not found or customer_order.paid_at is null or customer_order.delivered_at is null
    or lower(coalesce(customer_order.customer_email,'')) = '' then raise exception 'Order is not eligible'; end if;
  if now() > customer_order.delivered_at + make_interval(days => rules.first_fit_request_window_days)
    then raise exception 'The request window has passed'; end if;
  select id into first_order_id from public.orders
    where lower(customer_email) = lower(customer_order.customer_email) and paid_at is not null
    order by paid_at, id limit 1;
  if first_order_id is distinct from p_order_id then raise exception 'First purchase requirement not met'; end if;
  select * into purchased from public.order_items where id = p_order_item_id and order_id = p_order_id;
  if not found or purchased.sale_at_purchase is distinct from false or purchased.variant_id is null
    then raise exception 'Original full-price item cannot be verified'; end if;
  select * into original_variant from public.product_variants where id = purchased.variant_id;
  if not found or lower(trim(p_requested_size)) = lower(trim(purchased.size)) then raise exception 'Choose a different size'; end if;
  select * into replacement from public.product_variants
    where product_id = original_variant.product_id and lower(trim(size)) = lower(trim(p_requested_size))
      and active = true and stock_on_hand > 0 order by stock_on_hand desc limit 1;
  if not found then raise exception 'Requested replacement size is unavailable'; end if;
  if exists (select 1 from public.first_fit_exchanges where order_id = p_order_id)
    then raise exception 'First Fit Promise already requested for this order'; end if;
  insert into public.return_requests
    (client_request_id, order_id, order_number, order_verified, customer_name, customer_email,
     items, comments, requested_resolution, request_type, original_delivery_cents)
  values
    (p_client_request_id, p_order_id, p_order_id::text, true,
     coalesce(customer_order.shipping_details->>'name', 'IGNYTE customer'), customer_order.customer_email,
     jsonb_build_array(jsonb_build_object('order_item_id',p_order_item_id,'product_name',purchased.product_name,
       'sku',purchased.sku,'size',purchased.size,'quantity',1,'reason',p_reason,
       'sale_at_purchase',purchased.sale_at_purchase,'original_unit_price_cents',purchased.unit_price_cents,
       'list_price_at_purchase_cents',purchased.list_price_at_purchase_cents)),
     coalesce(p_comments,''), 'size_exchange', 'first_fit', customer_order.shipping_cents)
  returning id, reference into request_id, request_reference;
  insert into public.first_fit_exchanges
    (return_id,order_id,original_order_item_id,requested_size,replacement_variant_id)
  values (request_id,p_order_id,p_order_item_id,replacement.size,replacement.id);
  insert into public.return_events(return_id,event_type,to_status,note)
  values (request_id,'submitted','new_request','First Fit size exchange requested; staff review required');
  return query select request_id, request_reference;
end;
$$;
revoke all on function public.submit_first_fit_request(uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_first_fit_request(uuid,uuid,uuid,text,text,text) to service_role;
