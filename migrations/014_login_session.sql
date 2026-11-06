alter table public.profiles
  add column if not exists last_login_ip text,
  add column if not exists last_login_at timestamptz,
  add column if not exists active_session_id uuid;

notify pgrst, 'reload schema';
