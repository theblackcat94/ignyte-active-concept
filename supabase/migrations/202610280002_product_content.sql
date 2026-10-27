-- Optional, product-specific PDP content. The storefront falls back to the
-- supplied planner preview until staff saves approved copy for each product.
alter table public.products add column if not exists pdp_content jsonb not null default '{}'::jsonb
  check (jsonb_typeof(pdp_content) = 'object');
