-- Private, inactive post-purchase journey. Delivery must be confirmed by a trusted source.
create table if not exists public.post_purchase_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.post_purchase_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.post_purchase_steps (
  step text primary key check (step in ('fit_care','review_request','complete_set')),
  enabled boolean not null default false,
  delay_days integer not null check (delay_days between 1 and 90),
  subject text not null check (length(subject) between 1 and 160),
  preheader text not null check (length(preheader) between 1 and 200),
  body_copy text not null check (length(body_copy) between 1 and 6000),
  updated_at timestamptz not null default now()
);
insert into public.post_purchase_steps (step,delay_days,subject,preheader,body_copy) values
  ('fit_care',3,'How''s the fit? 🔥','A few simple tips to get the most from your new gear.',
   'Your new IGNYTE gear has arrived. Now it''s time to make it yours.\n\nWe hope you''re loving your new pieces. Here are a few things to help you get the most out of them.'),
  ('review_request',12,'Your IGNYTE verdict? 👀','The fit, the feel, the details. Tell us what you think.',
   'You''ve had some time with your new IGNYTE gear, and we''d love to know how it''s going.\n\nAs a new brand, your feedback helps us improve and helps other women find the right fit.'),
  ('complete_set',25,'Found your fit? Meet its match.','See the pieces that work with your latest IGNYTE pick.',
   'Found a new favourite? Make it a set.\n\nWe''ve picked a piece that works with your recent IGNYTE purchase, ready for your next move.')
on conflict (step) do nothing;

create table if not exists public.post_purchase_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  step text not null references public.post_purchase_steps(step),
  customer_email text not null,
  delivered_at timestamptz not null,
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','sending','sent','suppressed','failed')),
  reason text,
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, step)
);
create index if not exists post_purchase_due_idx on public.post_purchase_jobs (due_at) where status = 'scheduled';
create index if not exists post_purchase_email_idx on public.post_purchase_jobs (customer_email, created_at desc);

alter table public.post_purchase_settings enable row level security;
alter table public.post_purchase_steps enable row level security;
alter table public.post_purchase_jobs enable row level security;
revoke all on public.post_purchase_settings, public.post_purchase_steps, public.post_purchase_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.post_purchase_settings, public.post_purchase_steps, public.post_purchase_jobs to service_role;
