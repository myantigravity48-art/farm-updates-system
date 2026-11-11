-- Claim and finish daily alert rows atomically so concurrent jobs cannot duplicate sends.
alter table public.notification_log
  drop constraint notification_log_status_check,
  drop constraint notification_log_alert_type_check;

alter table public.notification_log
  add constraint notification_log_status_check check (status in ('sent', 'failed', 'pending')),
  add constraint notification_log_alert_type_check check (alert_type in ('heads_up', 'reminder', 'overdue', 'window_open', 'done_notice')),
  add column claimed_at timestamptz not null default now(),
  add column attempts integer not null default 0;

create or replace function public.claim_alert_rows(p_rows jsonb)
returns table (id uuid, farm_stage_id uuid, recipient_id uuid, alert_type text, occurrence_key text)
language sql
security invoker
set search_path = ''
as $$
  insert into public.notification_log as existing
    (farm_stage_id, recipient_id, alert_type, occurrence_key, status, claimed_at, attempts)
  select row_data.farm_stage_id, row_data.recipient_id, row_data.alert_type, row_data.occurrence_key,
         'pending', now(), 1
  from pg_catalog.jsonb_to_recordset(p_rows) as row_data(
    farm_stage_id uuid, recipient_id uuid, alert_type text, occurrence_key text
  )
  on conflict (farm_stage_id, recipient_id, alert_type, occurrence_key)
  do update set status = 'pending', claimed_at = now(), attempts = existing.attempts + 1, error = null
  where existing.status = 'failed'
     or (existing.status = 'pending' and existing.claimed_at < now() - interval '30 minutes')
  returning existing.id, existing.farm_stage_id, existing.recipient_id, existing.alert_type, existing.occurrence_key;
$$;

create or replace function public.finish_alert_rows(
  p_ids uuid[], p_status text, p_provider_message_id text, p_error text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_status is null or p_status not in ('sent', 'failed') then
    raise exception 'invalid_status';
  end if;

  update public.notification_log
  set status = p_status,
      provider_message_id = p_provider_message_id,
      error = left(p_error, 300),
      sent_at = case when p_status = 'sent' then now() else sent_at end
  where id = any(p_ids) and status = 'pending';
end;
$$;

revoke execute on function public.claim_alert_rows(jsonb) from public, anon, authenticated;
revoke execute on function public.finish_alert_rows(uuid[], text, text, text) from public, anon, authenticated;
grant execute on function public.claim_alert_rows(jsonb) to service_role;
grant execute on function public.finish_alert_rows(uuid[], text, text, text) to service_role;
