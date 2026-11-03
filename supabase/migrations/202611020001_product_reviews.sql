-- Private, moderated product reviews. Customer contact details never enter the public catalogue.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  fit_feedback text not null check (fit_feedback in ('runs_smaller','true_to_size','runs_larger')),
  body text not null check (char_length(trim(body)) between 20 and 3000),
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  email text not null check (char_length(trim(email)) between 5 and 254),
  photo_path text,
  verified_purchase boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);
create index if not exists product_reviews_public_idx on public.product_reviews(product_id, created_at desc) where status = 'approved';
create index if not exists product_reviews_moderation_idx on public.product_reviews(created_at desc) where status = 'pending';
create index if not exists product_reviews_duplicate_idx on public.product_reviews(product_id, lower(email), created_at desc);
alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from public, anon, authenticated;
grant select, insert, update on public.product_reviews to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
