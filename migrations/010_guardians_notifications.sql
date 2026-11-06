create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guardians_organization_idx on public.guardians (organization_id);
create index if not exists guardians_profile_idx on public.guardians (profile_id);
create unique index if not exists guardians_org_email_idx
  on public.guardians (organization_id, lower(email))
  where email is not null;

alter table public.students
  add column if not exists guardian_id uuid references public.guardians (id) on delete set null;

create index if not exists students_guardian_idx on public.students (guardian_id);

alter table public.class_sessions
  add column if not exists cancel_reason text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  class_session_id uuid references public.class_sessions (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  guardian_id uuid references public.guardians (id) on delete set null,
  kind text not null,
  recipient_name text not null,
  email text,
  phone text,
  title text not null,
  body text not null,
  channels jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_session_idx on public.notifications (class_session_id);
create index if not exists notifications_student_idx on public.notifications (student_id, created_at desc);
create index if not exists notifications_guardian_idx on public.notifications (guardian_id, created_at desc);

alter table public.guardians enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "guardians_staff_all" on public.guardians;
create policy "guardians_staff_all" on public.guardians
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "guardians_self_select" on public.guardians;
create policy "guardians_self_select" on public.guardians
  for select
  using (profile_id = auth.uid());

drop policy if exists "notifications_staff_select" on public.notifications;
create policy "notifications_staff_select" on public.notifications
  for select
  using (public.is_org_staff(organization_id));

grant all on public.guardians to anon, authenticated, service_role;
grant all on public.notifications to anon, authenticated, service_role;

notify pgrst, 'reload schema';
