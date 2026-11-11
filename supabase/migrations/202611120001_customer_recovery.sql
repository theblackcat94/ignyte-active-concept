-- Customer recovery is private and disabled until the campaign is reviewed.
alter table public.marketing_subscribers add column if not exists recovery_consent_at timestamptz;
create table if not exists public.customer_recovery_settings (
  id boolean primary key default true check (id),
  cart_enabled boolean not null default false,
  browse_enabled boolean not null default false,
  onsite_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.customer_recovery_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.customer_recovery_activity (
  id uuid primary key default gen_random_uuid(),
  email text not null references public.marketing_subscribers(email) on delete cascade,
  kind text not null check (kind in ('cart','browse')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  product_slug text,
  engagement jsonb not null default '{}'::jsonb,
  last_active_at timestamptz not null default now(),
  first_sent_at timestamptz,
  second_sent_at timestamptz,
  suppressed_at timestamptz,
  suppression_reason text,
  created_at timestamptz not null default now()
);
create index if not exists recovery_activity_email_idx on public.customer_recovery_activity(email, kind, created_at desc);
create unique index if not exists recovery_one_active_cycle_idx on public.customer_recovery_activity(email, kind)
  where suppressed_at is null;
create index if not exists recovery_activity_due_idx on public.customer_recovery_activity(kind, last_active_at)
  where suppressed_at is null;

create table if not exists public.customer_recovery_delivery (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.customer_recovery_activity(id) on delete cascade,
  stage text not null check (stage in ('cart_3h','cart_24h','browse_24h')),
  status text not null check (status in ('claimed','sent','failed','suppressed')),
  restore_hash text unique check (restore_hash is null or restore_hash ~ '^[a-f0-9]{64}$'),
  restore_expires_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  restored_at timestamptz,
  unique (activity_id, stage)
);

alter table public.customer_recovery_settings enable row level security;
alter table public.customer_recovery_activity enable row level security;
alter table public.customer_recovery_delivery enable row level security;
revoke all on public.customer_recovery_settings,
  public.customer_recovery_activity, public.customer_recovery_delivery from public, anon, authenticated;
grant select, insert, update, delete on public.customer_recovery_settings,
  public.customer_recovery_activity, public.customer_recovery_delivery to service_role;
