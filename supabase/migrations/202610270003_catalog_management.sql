-- Categories and sale prices are managed by staff through the server API.
create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 80),
  cover_path text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

insert into public.categories (slug, name, cover_path, sort_order) values
  ('sports-bras', 'Sports bras', '/images/collection-covers/Ignyte-Sports-Bras.jpg', 10),
  ('tops', 'Tops', '/images/collection-covers/Ignyte-Tops.jpg', 20),
  ('leggings', 'Leggings', '/images/collection-covers/Ignyte-Leggings.jpg', 30),
  ('shorts', 'Shorts', '/images/collection-covers/Ignyte-Shorts.jpg', 40)
on conflict (slug) do nothing;

alter table public.products drop constraint products_category_check;
alter table public.products add constraint products_category_fkey
  foreign key (category) references public.categories(slug) on update cascade;

alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
create policy "Visitors see active categories" on public.categories
  for select to anon, authenticated using (active);

alter table public.product_variants add column sale_price_cents integer;
alter table public.product_variants add constraint valid_sale_price
  check (sale_price_cents is null or
    (sale_price_cents > 0 and sale_price_cents < price_cents));

create or replace function public.save_product(p_product_id uuid, p_product jsonb, p_variants jsonb)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid := p_product_id;
  v_variant record;
begin
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) > 50 then
    raise exception 'Invalid variants';
  end if;
  if not exists (select 1 from public.categories
    where slug = p_product->>'category' and active) then
    raise exception 'Choose an active category';
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
      price_cents integer, sale_price_cents integer, stock_on_hand integer,
      stock_revision integer, active boolean)
  loop
    if v_variant.id is null then
      insert into public.product_variants
        (product_id, sku, size, price_cents, sale_price_cents, stock_on_hand, active)
      values (v_id, v_variant.sku, v_variant.size, v_variant.price_cents,
        v_variant.sale_price_cents, v_variant.stock_on_hand, v_variant.active);
    else
      update public.product_variants set sku = v_variant.sku, size = v_variant.size,
        price_cents = v_variant.price_cents, sale_price_cents = v_variant.sale_price_cents,
        stock_on_hand = v_variant.stock_on_hand, stock_revision = stock_revision + 1,
        active = v_variant.active
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

-- Checkout always snapshots the effective price in order_items.
create or replace function public.reserve_order(p_items jsonb, p_user_id uuid default null)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_item record;
  v_variant record;
  v_order_id uuid;
  v_total integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 20 then raise exception 'Invalid bag'; end if;
  if p_user_id is null or (select count(*) from public.orders
    where user_id = p_user_id and status = 'pending'
      and created_at > now() - interval '35 minutes') >= 3 then
    raise exception 'Too many open checkouts';
  end if;
  insert into public.orders (user_id, subtotal_cents)
    values (p_user_id, 0) returning id into v_order_id;
  for v_item in
    select variant_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by variant_id order by variant_id
  loop
    if v_item.variant_id is null or v_item.quantity is null
      or v_item.quantity < 1 or v_item.quantity > 20 then
      raise exception 'Invalid item';
    end if;
    select v.id, v.sku, v.size,
      coalesce(v.sale_price_cents, v.price_cents) as price_cents,
      v.stock_on_hand, p.name into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.id = v_item.variant_id and v.active and p.status = 'active'
      for update of v;
    if not found or v_variant.stock_on_hand < v_item.quantity then
      raise exception 'Item unavailable';
    end if;
    update public.product_variants set stock_on_hand = stock_on_hand - v_item.quantity,
      stock_revision = stock_revision + 1 where id = v_item.variant_id;
    insert into public.order_items
      (order_id, variant_id, product_name, sku, size, quantity, unit_price_cents)
      values (v_order_id, v_variant.id, v_variant.name, v_variant.sku,
        v_variant.size, v_item.quantity, v_variant.price_cents);
    v_total := v_total + v_variant.price_cents * v_item.quantity;
  end loop;
  update public.orders set subtotal_cents = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

revoke all on function public.save_product(uuid, jsonb, jsonb),
  public.reserve_order(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.save_product(uuid, jsonb, jsonb),
  public.reserve_order(jsonb, uuid) to service_role;
