begin;

alter table public.recipients
  add column phone text,
  add constraint recipients_phone_length_check
    check (phone is null or char_length(btrim(phone)) between 1 and 30);

-- Preserve the existing table-level access: authenticated users retain CRUD;
-- anon and public remain excluded. Existing RLS policies are unchanged.
revoke all on public.recipients from anon, public;
grant select, insert, update, delete on public.recipients to authenticated;

commit;
