-- Allow the dev app to bypass the guest-request throttle without changing
-- production behavior. This RPC is service-role-only; the dev server supplies
-- the flag from its private environment, never from browser input.
create or replace function public.create_guest_unpaid_order(
  p_items jsonb, p_customer_email text, p_shipping_details jsonb,
  p_client_request_id uuid, p_guest_token_hash text,
  p_disable_guest_order_limit boolean
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_order_id uuid;
  v_item record;
  v_variant record;
  v_total integer := 0;
begin
  if p_client_request_id is null or p_guest_token_hash is null or
     p_guest_token_hash !~ '^[a-f0-9]{64}$' or p_customer_email is null or
     length(trim(p_customer_email)) not between 5 and 254 or
     position('@' in p_customer_email) < 2 or
     p_shipping_details->'address'->>'country' is distinct from 'AU' or
     jsonb_typeof(p_items) is distinct from 'array' or
     jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Invalid guest order request';
  end if;

  select id into v_order_id from public.orders
    where client_request_id = p_client_request_id and user_id is null
      and lower(customer_email) = lower(trim(p_customer_email));
  if found then return v_order_id; end if;

  if not p_disable_guest_order_limit and
     (select count(*) from public.orders
      where user_id is null and lower(customer_email) = lower(trim(p_customer_email))
        and status = 'awaiting_payment' and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many recent guest requests';
  end if;

  insert into public.orders
    (user_id, customer_email, status, subtotal_cents, shipping_details,
     client_request_id, stock_reserved, guest_token_hash, guest_token_expires_at)
  values
    (null, lower(trim(p_customer_email)), 'awaiting_payment', 0, p_shipping_details,
     p_client_request_id, false, p_guest_token_hash, now() + interval '30 days')
  returning id into v_order_id;

  for v_item in
    select variant_id, sum(quantity)::integer as quantity
      from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
      group by variant_id order by variant_id
  loop
    if v_item.variant_id is null or v_item.quantity is null or
       v_item.quantity not between 1 and 20 then
      raise exception 'Invalid guest order item';
    end if;
    select v.id, v.sku, v.size,
      coalesce(v.sale_price_cents, v.price_cents) as price_cents,
      v.stock_on_hand, p.name into v_variant
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.id = v_item.variant_id and v.active and p.status = 'active'
      for share of v;
    if not found or v_variant.stock_on_hand < v_item.quantity then
      raise exception 'Guest order item unavailable';
    end if;
    insert into public.order_items
      (order_id, variant_id, product_name, sku, size, quantity, unit_price_cents)
    values
      (v_order_id, v_variant.id, v_variant.name, v_variant.sku,
       v_variant.size, v_item.quantity, v_variant.price_cents);
    v_total := v_total + v_variant.price_cents * v_item.quantity;
  end loop;
  update public.orders set subtotal_cents = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

revoke all on function public.create_guest_unpaid_order(jsonb, text, jsonb, uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.create_guest_unpaid_order(jsonb, text, jsonb, uuid, text, boolean)
  to service_role;
