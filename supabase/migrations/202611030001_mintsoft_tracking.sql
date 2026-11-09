-- Mintsoft delivery state is separate from payment state. Apply before enabling callbacks.
alter table public.orders
  add column if not exists shipping_status text not null default 'not_dispatched'
    check (shipping_status in ('not_dispatched', 'dispatched', 'delivered')),
  add column if not exists carrier_name text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists dispatched_at timestamptz,
  add column if not exists delivered_at timestamptz;

-- A callback may be retried or arrive out of order. This function makes the
-- transition atomic and never moves an order back from delivered to dispatched.
create or replace function public.apply_mintsoft_shipping_event(
  p_order_id uuid, p_event text, p_carrier text, p_tracking_number text,
  p_tracking_url text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  if p_event not in ('dispatched', 'delivered') then
    raise exception 'Invalid shipping event';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'paid' or
      v_order.shipping_details->>'test_order' = 'true' then
    raise exception 'Shipping event has no eligible paid order';
  end if;
  if v_order.shipping_status = 'delivered' or
      (v_order.shipping_status = 'dispatched' and p_event = 'dispatched') then
    return false;
  end if;
  update public.orders set
    shipping_status = p_event,
    carrier_name = coalesce(nullif(p_carrier, ''), carrier_name),
    tracking_number = coalesce(nullif(p_tracking_number, ''), tracking_number),
    tracking_url = coalesce(nullif(p_tracking_url, ''), tracking_url),
    dispatched_at = case when p_event = 'dispatched' then coalesce(dispatched_at, now()) else dispatched_at end,
    delivered_at = case when p_event = 'delivered' then coalesce(delivered_at, now()) else delivered_at end
  where id = p_order_id;
  return true;
end;
$$;

revoke all on function public.apply_mintsoft_shipping_event(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_mintsoft_shipping_event(uuid,text,text,text,text) to service_role;
