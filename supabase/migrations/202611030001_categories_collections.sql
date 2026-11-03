-- Categories remain product types; collections are independently curated products.
alter table public.categories add column if not exists cover_alt text not null default '';
alter table public.categories add column if not exists focal_x integer not null default 50 check (focal_x between 0 and 100);
alter table public.categories add column if not exists focal_y integer not null default 50 check (focal_y between 0 and 100);
alter table public.categories add column if not exists archived_at timestamptz;
drop policy if exists "Visitors see active categories" on public.categories;
create policy "Visitors see active categories" on public.categories
  for select to anon, authenticated using (active and archived_at is null);

create table if not exists public.category_redirects (
  old_slug text primary key,
  destination text not null check (destination like '/shop%'),
  created_at timestamptz not null default now()
);
alter table public.category_redirects enable row level security;
revoke all on public.category_redirects from anon, authenticated;

create or replace function public.manage_category_lifecycle(p_slug text, p_action text, p_reassign_to text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if p_slug is null or p_action not in ('hide','publish','archive','restore','delete') then raise exception 'Invalid category action'; end if;
  if not exists (select 1 from public.categories where slug = p_slug) then raise exception 'Category not found'; end if;
  select count(*) into v_count from public.products where category = p_slug;
  if p_action = 'hide' then
    update public.categories set active = false, archived_at = null where slug = p_slug;
  elsif p_action = 'publish' or p_action = 'restore' then
    update public.categories set active = true, archived_at = null where slug = p_slug;
  elsif p_action = 'archive' then
    update public.categories set active = false, archived_at = now() where slug = p_slug;
  else
    if v_count > 0 then
      if p_reassign_to is null or p_reassign_to = p_slug or
        not exists (select 1 from public.categories where slug = p_reassign_to and active and archived_at is null)
      then raise exception 'Choose another published category for the associated products'; end if;
      update public.products set category = p_reassign_to, updated_at = now() where category = p_slug;
    end if;
    insert into public.category_redirects(old_slug,destination)
      values(p_slug,case when p_reassign_to is null then '/shop/' else '/shop/' || p_reassign_to || '/' end)
      on conflict(old_slug) do update set destination = excluded.destination;
    delete from public.categories where slug = p_slug;
  end if;
  return v_count;
end; $$;
revoke all on function public.manage_category_lifecycle(text,text,text) from public, anon, authenticated;
grant execute on function public.manage_category_lifecycle(text,text,text) to service_role;

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 100),
  description text not null default '',
  cover_path text,
  cover_alt text not null default '',
  focal_x integer not null default 50 check (focal_x between 0 and 100),
  focal_y integer not null default 50 check (focal_y between 0 and 100),
  seo_title text not null default '',
  seo_description text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  publish_at timestamptz,
  mode text not null default 'manual' check (mode in ('manual','automatic')),
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  primary key(collection_id,product_id)
);
create table if not exists public.collection_redirects (
  old_slug text primary key,
  destination text not null check (destination like '/collections/%'),
  created_at timestamptz not null default now()
);
alter table public.collection_redirects enable row level security;
revoke all on public.collection_redirects from anon, authenticated;
create index if not exists collection_products_order_idx on public.collection_products(collection_id,sort_order);
create or replace function public.replace_collection_products(p_collection_id uuid, p_product_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_order integer := 0;
begin
  if not exists (select 1 from public.collections where id=p_collection_id) then raise exception 'Collection not found'; end if;
  if array_length(p_product_ids,1) > 100 or (select count(distinct x) from unnest(p_product_ids) x) is distinct from coalesce(array_length(p_product_ids,1),0) then raise exception 'Invalid or duplicate products'; end if;
  delete from public.collection_products where collection_id=p_collection_id;
  foreach v_id in array p_product_ids loop
    if not exists (select 1 from public.products where id=v_id) then raise exception 'Product not found'; end if;
    insert into public.collection_products(collection_id,product_id,sort_order) values(p_collection_id,v_id,v_order);
    v_order := v_order+1;
  end loop;
end; $$;
revoke all on function public.replace_collection_products(uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.replace_collection_products(uuid,uuid[]) to service_role;
create table if not exists public.collection_placements (
  placement text primary key,
  collection_id uuid references public.collections(id) on delete set null,
  max_products integer not null default 12 check (max_products between 1 and 24),
  updated_at timestamptz not null default now()
);
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.collection_placements enable row level security;
revoke all on public.collections, public.collection_products, public.collection_placements from anon, authenticated;
grant select on public.collections, public.collection_products, public.collection_placements to anon, authenticated;
create policy "Published collections are public" on public.collections for select to anon, authenticated
  using(status='published' and (publish_at is null or publish_at <= now()));
create policy "Published collection products are public" on public.collection_products for select to anon, authenticated
  using(exists(select 1 from public.collections c where c.id = collection_id and c.status='published' and (c.publish_at is null or c.publish_at <= now())));
create policy "Published placements are public" on public.collection_placements for select to anon, authenticated
  using(exists(select 1 from public.collections c where c.id = collection_id and c.status='published' and (c.publish_at is null or c.publish_at <= now())));

-- Migrate the exact current homepage edit selection once, without copying products.
insert into public.collections(slug,name,description,status)
values('the-ignyte-edit','The IGNYTE Edit','Our favourites, ready for your next move.','published')
on conflict(slug) do nothing;
insert into public.collection_products(collection_id,product_id,sort_order)
select c.id,p.id,x.ordinality::integer
from public.collections c
join unnest(array[
  'aura-halter-aurora','motion-sports-bra-black','seamless-legging-aurora',
  'all-in-motion-shorts-black','vyper-sports-bra-mauve','sculpt-shorts-mauve'
]) with ordinality as x(slug,ordinality) on true
join public.products p on p.slug=x.slug
where c.slug='the-ignyte-edit'
on conflict(collection_id,product_id) do nothing;
insert into public.collection_placements(placement,collection_id,max_products)
select 'home-ignyte-edit',id,12 from public.collections where slug='the-ignyte-edit'
on conflict(placement) do nothing;
