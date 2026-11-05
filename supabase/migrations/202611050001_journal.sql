-- Journal content stays server-only until the visibility setting is deliberately changed.
create table if not exists public.journal_settings (
  id boolean primary key default true check (id),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  updated_at timestamptz not null default now()
);
insert into public.journal_settings(id, visibility) values(true, 'private') on conflict (id) do nothing;

create table if not exists public.journal_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  excerpt text not null default '',
  category_id uuid references public.journal_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  publish_at timestamptz,
  featured boolean not null default false,
  sort_order integer not null default 0,
  author text not null default '',
  cover_url text not null default '',
  cover_alt text not null default '',
  thumbnail_url text not null default '',
  body jsonb not null default '[]'::jsonb check (jsonb_typeof(body) = 'array'),
  seo_title text not null default '',
  seo_description text not null default '',
  canonical_url text not null default '',
  og_image text not null default '',
  social_title text not null default '',
  social_description text not null default '',
  press_publication text not null default '',
  press_date date,
  press_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_articles_listing_idx on public.journal_articles(status, publish_at, sort_order);

alter table public.journal_settings enable row level security;
alter table public.journal_categories enable row level security;
alter table public.journal_articles enable row level security;
revoke all on public.journal_settings, public.journal_categories, public.journal_articles from public, anon, authenticated;
grant all on public.journal_settings, public.journal_categories, public.journal_articles to service_role;

insert into public.journal_categories(slug, name, description, sort_order) values
  ('the-latest', 'THE LATEST_', 'Brand announcements, launches and news.', 0),
  ('behind-the-brand', 'BEHIND THE BRAND_', 'The ideas and decisions behind IGNYTE.', 1),
  ('in-the-press', 'IN THE PRESS_', 'Verified third-party coverage.', 2)
on conflict (slug) do nothing;
