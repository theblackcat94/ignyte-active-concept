-- Public references are separate from UUIDs used by Stripe, Mintsoft and URLs.
alter table public.orders add column if not exists order_reference text;
create unique index if not exists orders_order_reference_key on public.orders (order_reference);
create sequence if not exists public.ignyte_live_order_number_seq;

-- Number paid live orders already placed before the change, oldest first.
with numbered as (
  select id, row_number() over (order by paid_at nulls last, created_at, id) as n
  from public.orders
  where status = 'paid' and coalesce(shipping_details->>'test_order', 'false') <> 'true'
    and order_reference is null
), offset_value as (
  select coalesce(max(substring(order_reference from '^IGN:([0-9]+)$')::bigint), 0) as n
  from public.orders
)
update public.orders o
set order_reference = 'IGN:' || lpad((v.n + x.n)::text, 5, '0')
from numbered v cross join offset_value x
where o.id = v.id;

select setval('public.ignyte_live_order_number_seq',
  greatest(coalesce((select max(substring(order_reference from '^IGN:([0-9]+)$')::bigint) from public.orders), 0), 1),
  exists (select 1 from public.orders where order_reference ~ '^IGN:[0-9]+$'));

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
  v_reference := 'IGN:' || lpad(nextval('public.ignyte_live_order_number_seq'::regclass)::text, 5, '0');
  update public.orders set order_reference = v_reference where id = p_order_id;
  return v_reference;
end;
$$;

revoke all on function public.assign_order_reference(uuid, boolean) from public, anon, authenticated;
grant execute on function public.assign_order_reference(uuid, boolean) to service_role;
