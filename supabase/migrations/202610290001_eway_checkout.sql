-- Eway hosted checkout. Sandbox transactions are marked as test orders.
alter table public.orders add column if not exists eway_access_code text unique;
alter table public.orders add column if not exists eway_shared_payment_url text;
alter table public.orders add column if not exists eway_transaction_id text unique;
alter table public.orders add column if not exists eway_environment text
  check (eway_environment in ('sandbox', 'production'));

create or replace function public.prepare_eway_order(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_stock integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'awaiting_payment' or
     v_order.total_cents is null or v_order.total_cents <= 0 or
     v_order.shipping_details->'address'->>'country' is distinct from 'AU' then
    raise exception 'Order is not ready for payment';
  end if;
  if v_order.eway_access_code is not null then return; end if;
  if not v_order.stock_reserved then
    for v_item in select variant_id, quantity from public.order_items
      where order_id = p_order_id order by variant_id
    loop
      if v_item.variant_id is null then raise exception 'Item unavailable'; end if;
      select stock_on_hand into v_stock from public.product_variants
        where id = v_item.variant_id and active for update;
      if not found or v_stock < v_item.quantity then raise exception 'Item unavailable'; end if;
      update public.product_variants set stock_on_hand = stock_on_hand - v_item.quantity,
        stock_revision = stock_revision + 1 where id = v_item.variant_id;
    end loop;
    update public.orders set stock_reserved = true where id = p_order_id;
  end if;
end;
$$;

create or replace function public.attach_eway_page(
  p_order_id uuid, p_access_code text, p_shared_url text, p_environment text,
  p_expected_total_cents integer
) returns boolean language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'awaiting_payment' or
     not v_order.stock_reserved or v_order.total_cents <> p_expected_total_cents or
     p_environment not in ('sandbox', 'production') then
    raise exception 'Order is not ready for payment';
  end if;
  if v_order.eway_access_code is not null then return false; end if;
  if nullif(p_access_code, '') is null or nullif(p_shared_url, '') is null then
    raise exception 'Invalid Eway page';
  end if;
  update public.orders set eway_access_code = p_access_code,
    eway_shared_payment_url = p_shared_url, eway_environment = p_environment,
    shipping_details = case when p_environment = 'sandbox' then
      coalesce(shipping_details, '{}'::jsonb) || '{"test_order":true}'::jsonb
      else shipping_details end
    where id = p_order_id;
  return true;
end;
$$;

create or replace function public.complete_eway_order(
  p_order_id uuid, p_access_code text, p_transaction_id text,
  p_total_cents integer, p_environment text
) returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status = 'paid' and v_order.eway_access_code = p_access_code and
     v_order.eway_transaction_id = p_transaction_id then return; end if;
  if v_order.status <> 'awaiting_payment' or not v_order.stock_reserved or
     v_order.eway_access_code is distinct from p_access_code or
     v_order.eway_environment is distinct from p_environment or
     v_order.total_cents is distinct from p_total_cents or
     nullif(p_transaction_id, '') is null then
    raise exception 'Eway payment does not match the order';
  end if;
  update public.orders set status = 'paid', eway_transaction_id = p_transaction_id,
    paid_at = now() where id = p_order_id;
end;
$$;

-- An order with an issued Eway payment page must be reconciled with Eway
-- before anyone can release its stock or cancel it.
create or replace function public.release_order(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status not in ('pending', 'awaiting_payment') then return; end if;
  if v_order.eway_access_code is not null then
    raise exception 'Reconcile Eway payment before cancelling order';
  end if;
  if v_order.stock_reserved then
    update public.product_variants v set stock_on_hand = v.stock_on_hand + i.quantity,
      stock_revision = v.stock_revision + 1
      from public.order_items i where i.order_id = p_order_id and i.variant_id = v.id;
  end if;
  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

-- Use only for disposable sandbox orders after checking the gateway result.
create or replace function public.cleanup_sandbox_eway_order(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.eway_environment is distinct from 'sandbox' or
     v_order.shipping_details->>'test_order' is distinct from 'true' or
     v_order.status not in ('awaiting_payment', 'paid') then
    raise exception 'Only marked sandbox orders can be cleaned up';
  end if;
  if v_order.stock_reserved then
    update public.product_variants v set stock_on_hand = v.stock_on_hand + i.quantity,
      stock_revision = v.stock_revision + 1
      from public.order_items i where i.order_id = p_order_id and i.variant_id = v.id;
  end if;
  update public.orders set status = 'cancelled', stock_reserved = false,
    shipping_details = shipping_details || '{"test_order_cleaned_up":true}'::jsonb
    where id = p_order_id;
end;
$$;

revoke all on function public.prepare_eway_order(uuid),
  public.attach_eway_page(uuid, text, text, text, integer),
  public.complete_eway_order(uuid, text, text, integer, text),
  public.cleanup_sandbox_eway_order(uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_eway_order(uuid),
  public.attach_eway_page(uuid, text, text, text, integer),
  public.complete_eway_order(uuid, text, text, integer, text),
  public.cleanup_sandbox_eway_order(uuid)
  to service_role;
