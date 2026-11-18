-- Change the customer-facing prefix and width without changing internal IDs.
begin;
lock table public.orders in share row exclusive mode;

update public.orders
set order_reference = 'IGNY-' || lpad(substring(order_reference from '^IGN:([0-9]+)$')::bigint::text, 4, '0')
where order_reference ~ '^IGN:[0-9]+$';

select setval('public.ignyte_live_order_number_seq',
  greatest(
    (select last_value from public.ignyte_live_order_number_seq),
    coalesce((select max(substring(order_reference from '^IGNY-([0-9]+)$')::bigint) from public.orders), 0),
    1
  ), true);

create or replace function public.assign_order_reference(p_order_id uuid, p_live boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_reference text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.order_reference is not null then return v_order.order_reference; end if;
  if not p_live then return null; end if;
  v_reference := 'IGNY-' || lpad(nextval('public.ignyte_live_order_number_seq'::regclass)::text, 4, '0');
  update public.orders set order_reference = v_reference where id = p_order_id;
  return v_reference;
end;
$$;

revoke all on function public.assign_order_reference(uuid, boolean) from public, anon, authenticated;
grant execute on function public.assign_order_reference(uuid, boolean) to service_role;
commit;
