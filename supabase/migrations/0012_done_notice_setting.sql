-- Allow the signed-in users to control optional marked-done email notices.
ALTER TABLE public.alert_settings
  ADD COLUMN done_notice_enabled boolean NOT NULL DEFAULT true;
