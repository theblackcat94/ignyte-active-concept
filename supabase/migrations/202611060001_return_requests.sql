-- Private returns records. Only the server service role may read or write them.
create sequence if not exists public.return_reference_seq;

-- Snapshot sale status when checkout creates each order item. Historical orders remain
-- unknown and require staff verification; today's catalogue is not a reliable source.
alter table public.order_items add column if not exists list_price_at_purchase_cents integer;
alter table public.order_items add column if not exists sale_at_purchase boolean;
create or replace function public.snapshot_order_item_sale() returns trigger
language plpgsql security definer set search_path = '' as $$
declare current_variant public.product_variants%rowtype;
begin
  select * into current_variant from public.product_variants where id = new.variant_id;
  if found then
    new.list_price_at_purchase_cents := current_variant.price_cents;
    new.sale_at_purchase := current_variant.sale_price_cents is not null and new.unit_price_cents = current_variant.sale_price_cents;
  end if;
  return new;
end;
$$;
drop trigger if exists order_item_sale_snapshot on public.order_items;
create trigger order_item_sale_snapshot before insert on public.order_items
for each row execute function public.snapshot_order_item_sale();
revoke all on function public.snapshot_order_item_sale() from public, anon, authenticated;

create table if not exists public.return_settings (
  id boolean primary key default true check (id),
  return_address text not null default '',
  shipping_instructions text not null default '',
  refund_processing_copy text not null default 'Once inspection is complete, we will confirm the approved resolution and next steps. No fixed processing timeframe is promised.',
  notification_emails text[] not null default '{}',
  instructions_email_intro text not null default 'Your return request has been reviewed.',
  updated_at timestamptz not null default now()
);
insert into public.return_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  reference text not null unique default ('IGN-RET-' || lpad(nextval('public.return_reference_seq')::text, 4, '0')),
  order_id uuid references public.orders(id) on delete set null,
  order_number text not null check (length(trim(order_number)) between 3 and 100),
  order_verified boolean not null default false,
  customer_name text not null check (length(trim(customer_name)) between 2 and 120),
  customer_email text not null check (length(trim(customer_email)) between 5 and 254),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  comments text not null default '',
  photo_paths text[] not null default '{}',
  requested_resolution text check (requested_resolution in ('store_credit','original_payment','statutory_remedy')),
  original_delivery_cents integer,
  approved_item_value_cents integer check (approved_item_value_cents >= 0),
  remedy_status text not null default 'not_issued' check (remedy_status in ('not_issued','pending','issued')),
  remedy_issued_at timestamptz,
  status text not null default 'new_request' check (status in (
    'new_request','under_review','awaiting_customer_return','in_transit','received_by_3pl',
    'inspection','quarantined','approved','declined','refunded','closed')),
  inspection_details text not null default '',
  refund_amount_cents integer check (refund_amount_cents >= 0),
  refund_transaction_reference text not null default '',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter sequence public.return_reference_seq owned by public.return_requests.reference;
create index if not exists return_requests_order_idx on public.return_requests(order_number);
create index if not exists return_requests_email_idx on public.return_requests(lower(customer_email));
create index if not exists return_requests_status_idx on public.return_requests(status, submitted_at desc);

create table if not exists public.return_events (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_requests(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('submitted','status','note','inspection','refund','instructions')),
  from_status text,
  to_status text,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists return_events_request_idx on public.return_events(return_id, created_at);

create table if not exists public.return_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  return_id uuid not null references public.return_requests(id) on delete cascade,
  recipient text not null,
  subject text not null,
  html_body text not null,
  text_body text not null,
  sent_at timestamptz,
  claimed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists return_email_pending_idx on public.return_email_outbox(created_at) where sent_at is null;

alter table public.return_settings enable row level security;
alter table public.return_requests enable row level security;
alter table public.return_events enable row level security;
alter table public.return_email_outbox enable row level security;
revoke all on public.return_settings, public.return_requests, public.return_events, public.return_email_outbox from public, anon, authenticated;
grant select, insert, update on public.return_settings, public.return_requests, public.return_events, public.return_email_outbox to service_role;
revoke all on sequence public.return_reference_seq from public, anon, authenticated;
grant usage, select on sequence public.return_reference_seq to service_role;

create or replace function public.update_return_request(
  p_id uuid, p_actor uuid, p_status text default null, p_note text default null,
  p_inspection text default null, p_approved_value integer default null,
  p_refund_amount integer default null, p_refund_reference text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  previous public.return_requests%rowtype;
  next_status text;
  maximum_paid integer;
begin
  select * into previous from public.return_requests where id = p_id for update;
  if not found then raise exception 'Return not found'; end if;
  next_status := coalesce(p_status, previous.status);
  if next_status not in ('new_request','under_review','awaiting_customer_return','in_transit','received_by_3pl','inspection','quarantined','approved','declined','refunded','closed') then raise exception 'Invalid status'; end if;
  if p_status = 'declined' and length(trim(coalesce(p_note,''))) < 5 then raise exception 'Declined returns need an outcome note'; end if;
  select sum((item->>'paid_value_cents')::integer) into maximum_paid
  from jsonb_array_elements(previous.items) item where item ? 'paid_value_cents';
  if p_approved_value is not null and (p_approved_value < 0 or (maximum_paid is not null and p_approved_value > maximum_paid)) then raise exception 'Approved item value exceeds the amount paid, excluding delivery'; end if;
  if p_status = 'approved' and (previous.status not in ('inspection','quarantined','received_by_3pl') or length(trim(coalesce(p_inspection, previous.inspection_details, ''))) < 3 or coalesce(p_approved_value, previous.approved_item_value_cents) is null) then raise exception 'Record the inspection and approved item value first'; end if;
  if p_status = 'refunded' and (previous.status <> 'approved' or previous.requested_resolution = 'store_credit' or p_refund_amount is null or p_refund_amount > coalesce(p_approved_value, previous.approved_item_value_cents, -1) or length(trim(coalesce(p_refund_reference,''))) < 3) then raise exception 'Only manually processed payment refunds can be recorded here; store credit issuance is not active'; end if;
  update public.return_requests set status = next_status,
    inspection_details = coalesce(p_inspection, inspection_details),
    approved_item_value_cents = coalesce(p_approved_value, approved_item_value_cents),
    refund_amount_cents = coalesce(p_refund_amount, refund_amount_cents),
    refund_transaction_reference = coalesce(p_refund_reference, refund_transaction_reference),
    remedy_status = case when p_status = 'refunded' then 'issued' when p_status = 'approved' then 'pending' else remedy_status end,
    remedy_issued_at = case when p_status = 'refunded' then now() else remedy_issued_at end,
    updated_at = now() where id = p_id;
  if p_status is not null and p_status <> previous.status then
    insert into public.return_events(return_id,actor_id,event_type,from_status,to_status,note)
    values (p_id,p_actor,'status',previous.status,p_status,coalesce(p_note,''));
  elsif p_note is not null and trim(p_note) <> '' then
    insert into public.return_events(return_id,actor_id,event_type,from_status,to_status,note)
    values (p_id,p_actor,'note',previous.status,previous.status,p_note);
  end if;
  if p_inspection is not null and trim(p_inspection) <> '' then
    insert into public.return_events(return_id,actor_id,event_type,note) values (p_id,p_actor,'inspection',p_inspection);
  end if;
  if p_refund_reference is not null and trim(p_refund_reference) <> '' then
    insert into public.return_events(return_id,actor_id,event_type,note) values (p_id,p_actor,'refund',p_refund_reference);
  end if;
end;
$$;
revoke all on function public.update_return_request(uuid,uuid,text,text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.update_return_request(uuid,uuid,text,text,text,integer,integer,text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('return-photos', 'return-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
