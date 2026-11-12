-- Browse copy and timing are independent of the existing cart recovery settings.
alter table public.customer_recovery_settings
  add column if not exists browse_subject text not null default 'Still thinking it over? 👀',
  add column if not exists browse_preheader text not null default 'Your next favourite might be worth another look.',
  add column if not exists browse_delay_hours integer not null default 24;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'browse_delay_hours_range' and conrelid = 'public.customer_recovery_settings'::regclass) then
    alter table public.customer_recovery_settings
      add constraint browse_delay_hours_range check (browse_delay_hours between 1 and 168);
  end if;
end $$;
