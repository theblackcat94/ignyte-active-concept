-- Reserve guest-order inventory immediately before creating a Stripe payment session.
create or replace function public.prepare_stripe_order(p_order_id uuid)
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

revoke all on function public.prepare_stripe_order(uuid) from public, anon, authenticated;
grant execute on function public.prepare_stripe_order(uuid) to service_role;
