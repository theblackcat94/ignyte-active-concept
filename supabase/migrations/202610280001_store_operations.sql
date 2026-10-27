-- Operational tools for the custom storefront. All writes remain server-only.
create table public.site_events (
  id bigint generated always as identity primary key,
  event_name text not null check (event_name in
    ('page_view','product_view','add_to_bag','checkout_started','order_requested')),
  page_path text not null check (length(page_path) between 1 and 180),
  created_at timestamptz not null default now()
);
create index site_events_created_idx on public.site_events(created_at desc);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  email text not null check (length(trim(email)) between 5 and 254),
  order_number text,
  message text not null check (length(trim(message)) between 10 and 4000),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index support_tickets_created_idx on public.support_tickets(created_at desc);

create table public.marketing_subscribers (
  email text primary key,
  status text not null default 'pending' check (status in ('pending','confirmed','unsubscribed')),
  consent_at timestamptz not null default now(),
  source text not null default 'footer',
  unsubscribe_token text unique not null,
  created_at timestamptz not null default now()
);

create table public.coupons (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  min_subtotal_cents integer not null default 0 check (min_subtotal_cents >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (starts_at is null or ends_at is null or ends_at > starts_at)
);
alter table public.orders add column discount_cents integer not null default 0
  check (discount_cents >= 0 and discount_cents <= subtotal_cents);
alter table public.orders add column coupon_code text;

create table public.shipping_rates (
  state text primary key check (state in ('ACT','NSW','NT','QLD','SA','TAS','VIC','WA')),
  rate_cents integer not null check (rate_cents >= 0),
  free_threshold_cents integer check (free_threshold_cents is null or free_threshold_cents >= 0),
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.site_events enable row level security;
alter table public.support_tickets enable row level security;
alter table public.marketing_subscribers enable row level security;
alter table public.coupons enable row level security;
alter table public.shipping_rates enable row level security;
revoke all on public.site_events, public.support_tickets,
  public.marketing_subscribers, public.coupons, public.shipping_rates
  from anon, authenticated;
grant select, insert, update, delete on public.site_events, public.support_tickets,
  public.marketing_subscribers, public.coupons, public.shipping_rates to service_role;
grant usage, select on sequence public.site_events_id_seq to service_role;

-- Coupon redemption is atomic; cancelled requests do not consume a slot.
create or replace function public.apply_coupon_to_order(p_order_id uuid, p_code text)
returns integer language plpgsql set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_coupon public.coupons%rowtype;
  v_discount integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'awaiting_payment' then
    raise exception 'Order is not eligible for a coupon';
  end if;
  if v_order.coupon_code is not null then
    if v_order.coupon_code = upper(trim(p_code)) then return v_order.discount_cents; end if;
    raise exception 'A different coupon is already applied';
  end if;
  select * into v_coupon from public.coupons
    where code = upper(trim(p_code)) for update;
  if not found or not v_coupon.active or
     (v_coupon.starts_at is not null and v_coupon.starts_at > now()) or
     (v_coupon.ends_at is not null and v_coupon.ends_at <= now()) or
     v_order.subtotal_cents < v_coupon.min_subtotal_cents then
    raise exception 'Coupon is not available for this order';
  end if;
  if v_coupon.usage_limit is not null and
     (select count(*) from public.orders where coupon_code = v_coupon.code
       and status in ('awaiting_payment','paid')) >= v_coupon.usage_limit then
    raise exception 'Coupon usage limit reached';
  end if;
  v_discount := case v_coupon.discount_type
    when 'percent' then floor(v_order.subtotal_cents * v_coupon.discount_value / 100.0)::integer
    else least(v_order.subtotal_cents, v_coupon.discount_value) end;
  update public.orders set coupon_code = v_coupon.code, discount_cents = v_discount
    where id = p_order_id;
  return v_discount;
end;
$$;
revoke all on function public.apply_coupon_to_order(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_coupon_to_order(uuid, text) to service_role;
