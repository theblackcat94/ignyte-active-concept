-- An order request reserves stock without collecting payment. Staff must arrange
-- shipping and payment before fulfillment; never mark it paid automatically.
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','awaiting_payment','paid','cancelled','refunded'));
alter table public.orders add column client_request_id uuid unique;

create or replace function public.create_unpaid_order(
  p_items jsonb, p_user_id uuid, p_customer_email text,
  p_shipping_details jsonb, p_client_request_id uuid
) returns uuid language plpgsql set search_path = '' as $$
declare v_order_id uuid;
begin
  if p_user_id is null or p_client_request_id is null or
    nullif(trim(p_customer_email), '') is null or
    p_shipping_details->'address'->>'country' is distinct from 'AU' then
    raise exception 'Invalid order request';
  end if;
  select id into v_order_id from public.orders
    where client_request_id = p_client_request_id and user_id = p_user_id;
  if found then return v_order_id; end if;
  if (select count(*) from public.orders where user_id = p_user_id
      and status = 'awaiting_payment' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many recent order requests';
  end if;
  v_order_id := public.reserve_order(p_items, p_user_id);
  update public.orders set status = 'awaiting_payment',
    customer_email = p_customer_email,
    shipping_details = p_shipping_details,
    client_request_id = p_client_request_id
    where id = v_order_id;
  return v_order_id;
end;
$$;

revoke all on function public.create_unpaid_order(jsonb, uuid, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_unpaid_order(jsonb, uuid, text, jsonb, uuid)
  to service_role;

-- Releasing a manually cancelled order returns its reserved stock once.
create or replace function public.release_order(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status not in ('pending', 'awaiting_payment') then return; end if;
  update public.product_variants v set stock_on_hand = v.stock_on_hand + i.quantity,
    stock_revision = v.stock_revision + 1
    from public.order_items i where i.order_id = p_order_id and i.variant_id = v.id;
  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;
