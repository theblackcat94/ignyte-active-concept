-- Run in a new Supabase project. Staff membership is granted manually by the
-- project owner; customers cannot grant themselves access to the admin.
create extension if not exists pgcrypto;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category text not null check (category in ('sports-bras','tops','leggings','shorts')),
  color text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  label text,
  image_path text not null,
  gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size text not null,
  price_cents integer not null check (price_cents >= 0),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  stock_revision integer not null default 0,
  active boolean not null default false,
  unique (product_id, size)
);

create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_email text,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  currency text not null default 'aud' check (currency = 'aud'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer check (total_cents >= 0),
  shipping_details jsonb,
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text not null,
  size text not null,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index product_variants_product_idx on public.product_variants(product_id);

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.staff_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.products, public.product_variants, public.staff_members,
  public.orders, public.order_items from anon, authenticated;
grant select on public.products, public.product_variants to anon, authenticated;
grant select on public.staff_members, public.orders, public.order_items to authenticated;

create policy "Visitors see active products" on public.products
  for select to anon, authenticated using (status = 'active');
create policy "Visitors see variants of active products" on public.product_variants
  for select to anon, authenticated using (
    active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );
create policy "Users see own staff membership" on public.staff_members
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users see own orders" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users see own order items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

-- Keep the browser unable to alter prices, stock, roles, or order state.
-- All such writes run on the server after authorization.

create or replace function public.reserve_order(p_items jsonb, p_user_id uuid default null)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_item record;
  v_variant record;
  v_order_id uuid;
  v_total integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 20 then
    raise exception 'Invalid bag';
  end if;
  if p_user_id is null or (select count(*) from public.orders
    where user_id = p_user_id and status = 'pending' and created_at > now() - interval '35 minutes') >= 3 then
    raise exception 'Too many open checkouts';
  end if;
  insert into public.orders (user_id, subtotal_cents) values (p_user_id, 0) returning id into v_order_id;
  for v_item in
    select variant_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by variant_id order by variant_id
  loop
    if v_item.variant_id is null or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 20 then
      raise exception 'Invalid item';
    end if;
    select v.id, v.sku, v.size, v.price_cents, v.stock_on_hand, p.name
      into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.id = v_item.variant_id and v.active and p.status = 'active'
      for update of v;
    if not found or v_variant.stock_on_hand < v_item.quantity then
      raise exception 'Item unavailable';
    end if;
    update public.product_variants set stock_on_hand = stock_on_hand - v_item.quantity,
      stock_revision = stock_revision + 1 where id = v_item.variant_id;
    insert into public.order_items (order_id, variant_id, product_name, sku, size, quantity, unit_price_cents)
      values (v_order_id, v_variant.id, v_variant.name, v_variant.sku, v_variant.size,
        v_item.quantity, v_variant.price_cents);
    v_total := v_total + v_variant.price_cents * v_item.quantity;
  end loop;
  update public.orders set subtotal_cents = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

create or replace function public.release_order(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'pending' then return; end if;
  update public.product_variants v set stock_on_hand = v.stock_on_hand + i.quantity,
    stock_revision = v.stock_revision + 1
    from public.order_items i where i.order_id = p_order_id and i.variant_id = v.id;
  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

create or replace function public.complete_order(p_order_id uuid, p_session_id text,
  p_payment_intent_id text, p_customer_email text, p_shipping_cents integer,
  p_total_cents integer, p_shipping_details jsonb)
returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status = 'paid' and v_order.stripe_session_id = p_session_id then return; end if;
  if v_order.status <> 'pending' then raise exception 'Order is no longer payable'; end if;
  if p_shipping_cents < 0 or p_total_cents <> v_order.subtotal_cents + p_shipping_cents
    or p_shipping_details is null then
    raise exception 'Invalid paid order details';
  end if;
  update public.orders set status = 'paid', stripe_session_id = p_session_id,
    stripe_payment_intent_id = p_payment_intent_id, customer_email = p_customer_email,
    shipping_cents = p_shipping_cents, total_cents = p_total_cents,
    shipping_details = p_shipping_details,
    paid_at = now() where id = p_order_id;
end;
$$;

create or replace function public.save_product(p_product_id uuid, p_product jsonb, p_variants jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := p_product_id;
  v_variant record;
begin
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 50 then
    raise exception 'Invalid variants';
  end if;
  if v_id is null then
    insert into public.products (slug, name, category, color, description, status, label, image_path, gallery)
    values (p_product->>'slug', p_product->>'name', p_product->>'category', p_product->>'color',
      p_product->>'description', 'draft', p_product->>'label', p_product->>'image_path',
      p_product->'gallery') returning id into v_id;
  else
    update public.products set slug = p_product->>'slug', name = p_product->>'name',
      category = p_product->>'category', color = p_product->>'color',
      description = p_product->>'description', label = p_product->>'label',
      image_path = p_product->>'image_path', gallery = p_product->'gallery', updated_at = now()
    where id = v_id;
    if not found then raise exception 'Product not found'; end if;
  end if;
  for v_variant in
    select * from jsonb_to_recordset(p_variants) as x(id uuid, sku text, size text,
      price_cents integer, stock_on_hand integer, stock_revision integer, active boolean)
  loop
    if v_variant.id is null then
      insert into public.product_variants (product_id, sku, size, price_cents, stock_on_hand, active)
      values (v_id, v_variant.sku, v_variant.size, v_variant.price_cents,
        v_variant.stock_on_hand, v_variant.active);
    else
      update public.product_variants set sku = v_variant.sku, size = v_variant.size,
        price_cents = v_variant.price_cents, stock_on_hand = v_variant.stock_on_hand,
        stock_revision = stock_revision + 1, active = v_variant.active
      where id = v_variant.id and product_id = v_id
        and stock_revision = v_variant.stock_revision;
      if not found then raise exception 'Variant changed. Reload before saving'; end if;
    end if;
  end loop;
  if p_product->>'status' = 'active' and not exists (
    select 1 from public.product_variants where product_id = v_id and active and price_cents > 0
  ) then raise exception 'Active product needs a priced variant'; end if;
  update public.products set status = p_product->>'status' where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.reserve_order(jsonb, uuid), public.release_order(uuid),
  public.complete_order(uuid, text, text, text, integer, integer, jsonb),
  public.save_product(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_order(jsonb, uuid), public.release_order(uuid),
  public.complete_order(uuid, text, text, text, integer, integer, jsonb),
  public.save_product(uuid, jsonb, jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 8388608,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
