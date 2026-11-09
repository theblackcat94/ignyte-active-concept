-- Mintsoft is the stock source; website-only reservations remain subtracted
-- until their orders are acknowledged in Mintsoft.
alter table public.orders add column if not exists mintsoft_order_id bigint unique;
alter table public.product_variants
  add column if not exists mintsoft_level integer check (mintsoft_level >= 0),
  add column if not exists mintsoft_synced_at timestamptz,
  add column if not exists mintsoft_warehouse_id integer;

create or replace function public.apply_mintsoft_stock_snapshot(
  p_warehouse_id integer, p_levels jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  v_missing integer;
  v_row record;
  v_reserved integer;
begin
  if p_warehouse_id is null or p_warehouse_id <= 0 or
      jsonb_typeof(p_levels) <> 'array' or jsonb_array_length(p_levels) = 0 then
    raise exception 'Invalid stock snapshot';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_levels) as x(sku text, level integer)
    where x.sku is null or x.level is null or x.level < 0
  ) or exists (
    select 1 from jsonb_to_recordset(p_levels) as x(sku text, level integer)
    group by upper(x.sku) having count(*) > 1
  ) then
    raise exception 'Invalid or duplicate Mintsoft SKU';
  end if;
  select count(*) into v_missing
  from public.product_variants v join public.products p on p.id = v.product_id
  where p.status = 'active' and v.active and not exists (
    select 1 from jsonb_to_recordset(p_levels) as x(sku text, level integer)
    where upper(x.sku) = upper(v.sku)
  );
  if v_missing > 0 then raise exception 'Mintsoft snapshot missing % active SKUs', v_missing; end if;

  for v_row in
    select v.id, v.sku, x.level
    from public.product_variants v join public.products p on p.id = v.product_id
    join jsonb_to_recordset(p_levels) as x(sku text, level integer) on upper(x.sku) = upper(v.sku)
    where p.status = 'active' and v.active order by v.id
  loop
    -- Checkout reserves the same variant row. Lock first, then count committed
    -- website reservations so a concurrent checkout cannot be overwritten.
    perform 1 from public.product_variants where id = v_row.id for update;
    select coalesce(sum(i.quantity), 0)::integer into v_reserved
    from public.order_items i join public.orders o on o.id = i.order_id
    where i.variant_id = v_row.id and o.stock_reserved and
      o.status in ('awaiting_payment', 'paid') and o.mintsoft_order_id is null and
      coalesce(o.shipping_details->>'test_order', 'false') <> 'true';
    update public.product_variants set
      mintsoft_level = v_row.level,
      mintsoft_synced_at = now(),
      mintsoft_warehouse_id = p_warehouse_id,
      stock_on_hand = greatest(0, v_row.level - v_reserved),
      stock_revision = stock_revision + case
        when stock_on_hand is distinct from greatest(0, v_row.level - v_reserved) then 1 else 0 end
    where id = v_row.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.apply_mintsoft_stock_snapshot(integer,jsonb) from public, anon, authenticated;
grant execute on function public.apply_mintsoft_stock_snapshot(integer,jsonb) to service_role;
