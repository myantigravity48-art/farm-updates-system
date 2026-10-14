-- 0001_schema.sql
-- Database schema for Farm updates system v1.
-- Run in the Supabase SQL Editor in order: 0001 first, then 0002.

-- ---------------------------------------------------------------------------
-- season_windows
-- ---------------------------------------------------------------------------
create table public.season_windows (
  key         text primary key check (key in ('dry_season', 'planting')),
  start_month int  not null check (start_month between 1 and 12),
  start_day   int  not null check (start_day   between 1 and 31),
  end_month   int  not null check (end_month   between 1 and 12),
  end_day     int  not null check (end_day     between 1 and 31)
);

alter table public.season_windows enable row level security;

-- ---------------------------------------------------------------------------
-- stage_templates
-- ---------------------------------------------------------------------------
create table public.stage_templates (
  id            uuid primary key default gen_random_uuid(),
  position      int  not null unique,
  name          text not null,
  trigger_type  text not null check (trigger_type in ('season_window', 'after_planting')),
  offset_months int,
  window_key    text references public.season_windows (key),
  constraint stage_templates_trigger_check check (
    (trigger_type = 'season_window'   and window_key is not null and offset_months is null) or
    (trigger_type = 'after_planting'  and offset_months is not null and window_key is null)
  )
);

create index stage_templates_window_key_idx on public.stage_templates (window_key);

alter table public.stage_templates enable row level security;

-- ---------------------------------------------------------------------------
-- farms
-- ---------------------------------------------------------------------------
create table public.farms (
  id                   uuid        primary key default gen_random_uuid(),
  name                 text        not null,
  location             text,
  size_value           numeric,
  size_unit            text,
  planting_date        date,
  schedule_anchor_date date        not null default current_date,
  notes                text,
  created_at           timestamptz not null default now(),
  created_by           uuid        default auth.uid() references auth.users (id)
);

create unique index farms_name_lower_idx on public.farms (lower(name));
create index farms_created_by_idx on public.farms (created_by);

alter table public.farms enable row level security;

-- ---------------------------------------------------------------------------
-- farm_stages
-- ---------------------------------------------------------------------------
create table public.farm_stages (
  id                uuid    primary key default gen_random_uuid(),
  farm_id           uuid    not null references public.farms (id) on delete cascade,
  template_id       uuid    not null references public.stage_templates (id),
  is_done           boolean not null default false,
  done_date         date,
  done_by           uuid    references auth.users (id),
  done_note         text,
  due_date_override date,
  unique (farm_id, template_id)
);

create index farm_stages_farm_id_idx     on public.farm_stages (farm_id);
create index farm_stages_template_id_idx on public.farm_stages (template_id);
create index farm_stages_done_by_idx     on public.farm_stages (done_by);

alter table public.farm_stages enable row level security;

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table public.notes (
  id             uuid        primary key default gen_random_uuid(),
  farm_id        uuid        not null references public.farms (id) on delete cascade,
  farm_stage_id  uuid        references public.farm_stages (id) on delete set null,
  body           text        not null,
  created_by     uuid        default auth.uid() references auth.users (id),
  created_at     timestamptz not null default now()
);

create index notes_farm_id_idx       on public.notes (farm_id);
create index notes_farm_stage_id_idx on public.notes (farm_stage_id);
create index notes_created_by_idx    on public.notes (created_by);

alter table public.notes enable row level security;

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------
create table public.photos (
  id             uuid        primary key default gen_random_uuid(),
  farm_id        uuid        not null references public.farms (id) on delete cascade,
  farm_stage_id  uuid        references public.farm_stages (id) on delete set null,
  storage_path   text        not null,
  caption        text,
  taken_on       date,
  created_by     uuid        default auth.uid() references auth.users (id),
  created_at     timestamptz not null default now()
);

create index photos_farm_id_idx       on public.photos (farm_id);
create index photos_farm_stage_id_idx on public.photos (farm_stage_id);
create index photos_created_by_idx    on public.photos (created_by);

alter table public.photos enable row level security;

-- ---------------------------------------------------------------------------
-- recipients
-- ---------------------------------------------------------------------------
create table public.recipients (
  id      uuid    primary key default gen_random_uuid(),
  name    text    not null,
  email   text    not null,
  enabled boolean not null default true
);

create unique index recipients_email_lower_idx on public.recipients (lower(email));

alter table public.recipients enable row level security;

-- ---------------------------------------------------------------------------
-- alert_settings (single-row table)
-- ---------------------------------------------------------------------------
create table public.alert_settings (
  id                 boolean primary key default true check (id),
  heads_up_days      int     not null default 14 check (heads_up_days > 0),
  reminder_days      int     not null default 3  check (reminder_days >= 0),
  overdue_enabled    boolean not null default true,
  overdue_repeat_days int    not null default 3  check (overdue_repeat_days >= 1),
  send_hour_london   int     not null default 8  check (send_hour_london between 0 and 23),
  constraint alert_settings_reminder_lt_heads_up check (reminder_days < heads_up_days)
);

alter table public.alert_settings enable row level security;

-- ---------------------------------------------------------------------------
-- notification_log
-- ---------------------------------------------------------------------------
create table public.notification_log (
  id                  uuid        primary key default gen_random_uuid(),
  farm_stage_id       uuid        not null references public.farm_stages (id) on delete cascade,
  recipient_id        uuid        not null references public.recipients (id) on delete cascade,
  alert_type          text        not null check (alert_type in ('heads_up', 'reminder', 'overdue', 'done_notice')),
  occurrence_key      text        not null,
  status              text        not null check (status in ('sent', 'failed')),
  provider_message_id text,
  error               text,
  sent_at             timestamptz not null default now(),
  unique (farm_stage_id, recipient_id, alert_type, occurrence_key)
);

create index notification_log_farm_stage_id_idx on public.notification_log (farm_stage_id);
create index notification_log_recipient_id_idx  on public.notification_log (recipient_id);

alter table public.notification_log enable row level security;

-- ---------------------------------------------------------------------------
-- Auto-create farm_stages when a farm is inserted
-- ---------------------------------------------------------------------------
create or replace function public.auto_create_farm_stages()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.farm_stages (farm_id, template_id, is_done)
  select new.id, st.id, false
  from public.stage_templates st;
  return new;
end;
$$;

create trigger trg_auto_create_farm_stages
  after insert on public.farms
  for each row
  execute function public.auto_create_farm_stages();

-- ---------------------------------------------------------------------------
-- Storage: private bucket for farm photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'farm-photos',
  'farm-photos',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Storage policies: authenticated users only
create policy "Authenticated users can view farm photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'farm-photos'
    and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Authenticated users can upload farm photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'farm-photos'
    and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Authenticated users can update farm photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'farm-photos'
    and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  )
  with check (
    bucket_id = 'farm-photos'
    and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "Authenticated users can delete farm photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'farm-photos'
    and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- ---------------------------------------------------------------------------
-- Grants: revoke anon and public, grant authenticated and service_role
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, public;
revoke all on all sequences in schema public from anon, public;
revoke all on all functions in schema public from anon, public;
revoke all on schema public from anon, public;

-- Authenticated: full CRUD on data tables
grant select, insert, update, delete on public.farms          to authenticated;
grant select, insert, update, delete on public.farm_stages    to authenticated;
grant select, insert, update, delete on public.notes          to authenticated;
grant select, insert, update, delete on public.photos         to authenticated;
grant select, insert, update, delete on public.recipients     to authenticated;

-- Authenticated: read and edit config tables (no insert/delete)
grant select, update on public.stage_templates  to authenticated;
grant select, update on public.season_windows   to authenticated;
grant select, update on public.alert_settings   to authenticated;

-- Authenticated: read-only on notification_log (alert job writes via service_role)
grant select on public.notification_log to authenticated;

-- service_role: full access to everything
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Ensure schema usage
grant usage on schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- farms: full access for authenticated
create policy "Authenticated full access" on public.farms
  for all to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- farm_stages: full access for authenticated
create policy "Authenticated full access" on public.farm_stages
  for all to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- notes: full access for authenticated
create policy "Authenticated full access" on public.notes
  for all to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- photos: full access for authenticated
create policy "Authenticated full access" on public.photos
  for all to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- recipients: full access for authenticated
create policy "Authenticated full access" on public.recipients
  for all to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- stage_templates: select and update only
create policy "Authenticated read" on public.stage_templates
  for select to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
create policy "Authenticated update" on public.stage_templates
  for update to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- season_windows: select and update only
create policy "Authenticated read" on public.season_windows
  for select to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
create policy "Authenticated update" on public.season_windows
  for update to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- alert_settings: select and update only
create policy "Authenticated read" on public.alert_settings
  for select to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
create policy "Authenticated update" on public.alert_settings
  for update to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
  with check (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- notification_log: select only for authenticated
create policy "Authenticated read" on public.notification_log
  for select to authenticated
  using (coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
