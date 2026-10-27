-- Concept catalogue copied from lib/catalog.ts. These are drafts only.
-- Review every SKU, size, price and stock count before activating anything.
insert into public.products
  (slug, name, category, color, description, status, label, image_path, gallery)
values
  ('aura-halter-lavender','Aura Halter','tops','Lavender','A sleek halter silhouette for the sessions you show up for.','draft','BEST SELLER','/images/catalog/aura-halter-jac.jpeg','[{"image":"/images/product/Ignyte-Material.jpg","alt":"Ignyte activewear fabric detail"},{"image":"/images/product/Ingyte-Express.jpg","alt":"Ignyte training editorial"}]'),
  ('seamless-legging-lavender','Seamless Legging','leggings','Lavender','A second-skin feel with a confident, supportive fit.','draft','NEW','/images/catalog/seamless-legging-jac.jpeg','[{"image":"/images/collection-covers/Ignyte-Leggings.jpg","alt":"Ignyte leggings collection detail"},{"image":"/images/product/Ignyte-Built-for-the-Burn.jpg","alt":"Ignyte training editorial"}]'),
  ('seamless-short-espresso','Seamless Short','shorts','Espresso','Freedom to move, from warm-up to the last rep.','draft',null,'/images/catalog/seamless-short-espresso.jpeg','[{"image":"/images/collection-covers/Ignyte-Shorts.jpg","alt":"Ignyte shorts collection detail"},{"image":"/images/product/Ignyte-Movement.jpg","alt":"Ignyte movement editorial"}]'),
  ('seamless-sports-bra-espresso','Seamless Sports Bra','sports-bras','Espresso','Steady support for training days and everything after.','draft','POPULAR','/images/catalog/seamless-bra-espresso.jpeg','[{"image":"/images/collection-covers/Ignyte-Sports-Bras.jpg","alt":"Ignyte sports bras collection"},{"image":"/images/product/Ignyte-Training.jpg","alt":"Ignyte training editorial"}]'),
  ('aura-halter-espresso','Aura Halter','tops','Espresso','A streamlined training layer with a bold feel.','draft',null,'/images/catalog/aura-halter-espresso.jpeg','[{"image":"/images/collection-covers/Ignyte-Tops.jpg","alt":"Ignyte tops collection detail"},{"image":"/images/product/Ignyte-Material-Alt.jpg","alt":"Ignyte activewear fabric detail"}]'),
  ('seamless-legging-espresso','Seamless Legging','leggings','Espresso','Made to move with you through every session.','draft',null,'/images/catalog/seamless-legging-espresso.jpeg','[{"image":"/images/collection-covers/Ignyte-Leggings.jpg","alt":"Ignyte leggings collection detail"},{"image":"/images/product/Ignyte-Movement.jpg","alt":"Ignyte movement editorial"}]')
on conflict (slug) do nothing;

insert into public.product_variants (product_id, sku, size, price_cents, stock_on_hand, active)
select p.id, upper(replace(p.slug, '-', '_')) || '_' || sizes.size,
  sizes.size,
  case when p.category = 'sports-bras' then 5500 when p.category = 'shorts' or p.category = 'tops' then 6000 else 7000 end,
  0, false
from public.products p
cross join (values ('XS'),('S'),('M'),('L'),('XL')) as sizes(size)
where p.slug in ('aura-halter-lavender','seamless-legging-lavender','seamless-short-espresso',
  'seamless-sports-bra-espresso','aura-halter-espresso','seamless-legging-espresso')
on conflict (sku) do nothing;
