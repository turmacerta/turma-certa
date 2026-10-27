-- Turma Certa · 009
-- Backoffice: donos do SaaS, não donos da escola.

create table if not exists public.platform_admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists "platform_admins_self_select" on public.platform_admins;
create policy "platform_admins_self_select" on public.platform_admins
  for select
  using (profile_id = auth.uid());

create or replace view public.platform_organization_overview
with (security_invoker = true) as
select
  o.id,
  o.name,
  o.slug,
  o.saas_plan,
  o.email as organization_email,
  o.created_at,
  (
    select count(*)::int
    from public.students s
    where s.organization_id = o.id
  ) as student_count,
  (
    select count(*)::int
    from public.teachers t
    where t.organization_id = o.id
  ) as teacher_count,
  (
    select count(*)::int
    from public.class_groups g
    where g.organization_id = o.id
  ) as class_count,
  (
    select count(*)::int
    from public.units u
    where u.organization_id = o.id
  ) as unit_count
from public.organizations o;

grant select on public.platform_organization_overview to anon, authenticated, service_role;
grant all on public.platform_admins to service_role;

notify pgrst, 'reload schema';

-- Opcional: promove um usuário já cadastrado (troque o e-mail).
-- insert into public.platform_admins (profile_id)
-- select id from public.profiles where lower(email) = lower('voce@turmacerta.com')
-- on conflict do nothing;
