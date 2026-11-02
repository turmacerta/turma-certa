do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_tag') then
    create type public.member_tag as enum ('student', 'teacher', 'manager');
  end if;
end
$$;

create table if not exists public.organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  tag public.member_tag not null,
  template text,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_roles_org_idx on public.organization_roles (organization_id);
create unique index if not exists organization_roles_template_idx
  on public.organization_roles (organization_id, template)
  where template is not null;

alter table public.organization_members
  add column if not exists role_id uuid references public.organization_roles (id) on delete set null,
  add column if not exists status text not null default 'active',
  add column if not exists invited_at timestamptz;

create table if not exists public.membership_activity (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tag public.member_tag not null,
  month date not null,
  primary key (organization_id, profile_id, tag, month)
);

alter table public.organizations
  add column if not exists lesson_rules jsonb not null default '{}'::jsonb,
  add column if not exists logo_sport text;

alter table public.students add column if not exists photo_url text;
alter table public.teachers add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

alter table public.organization_roles enable row level security;
alter table public.membership_activity enable row level security;

drop policy if exists "organization_roles_member_select" on public.organization_roles;
create policy "organization_roles_member_select" on public.organization_roles
  for select
  using (public.is_org_member(organization_id));

grant all on public.organization_roles to anon, authenticated, service_role;
grant all on public.membership_activity to service_role;

notify pgrst, 'reload schema';
