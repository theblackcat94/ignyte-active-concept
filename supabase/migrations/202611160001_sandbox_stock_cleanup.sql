-- Sandbox orders share the live catalogue. A Mintsoft snapshot deliberately
-- excludes their reservations, so cleanup must recompute from that snapshot
-- instead of adding the test quantity to a possibly refreshed stock row.
create or replace function public.cleanup_sandbox_stripe_order(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_reserved integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status not in ('awaiting_payment', 'paid') or
      v_order.shipping_details->>'test_order' is distinct from 'true' or
      v_order.stripe_session_id is null or v_order.eway_transaction_id is not null then
    raise exception 'Only a marked Stripe test order can be cleaned up';
  end if;

  if v_order.stock_reserved then
    for v_item in
      select variant_id, sum(quantity)::integer as quantity
      from public.order_items where order_id = p_order_id
      group by variant_id order by variant_id
    loop
      perform 1 from public.product_variants where id = v_item.variant_id for update;
      select coalesce(sum(i.quantity), 0)::integer into v_reserved
      from public.order_items i join public.orders o on o.id = i.order_id
      where i.variant_id = v_item.variant_id and o.stock_reserved and
        o.status in ('awaiting_payment', 'paid') and o.mintsoft_order_id is null and
        coalesce(o.shipping_details->>'test_order', 'false') <> 'true';
      update public.product_variants v set
        stock_on_hand = case when v.mintsoft_level is not null
          then greatest(0, v.mintsoft_level - v_reserved)
          else v.stock_on_hand + v_item.quantity end,
        stock_revision = v.stock_revision + 1
      where v.id = v_item.variant_id;
    end loop;
  end if;

  update public.orders set status = 'cancelled', stock_reserved = false,
    shipping_details = shipping_details || '{"test_order_cleaned_up":true}'::jsonb
    where id = p_order_id;
end;
$$;

revoke all on function public.cleanup_sandbox_stripe_order(uuid) from public, anon, authenticated;
grant execute on function public.cleanup_sandbox_stripe_order(uuid) to service_role;
