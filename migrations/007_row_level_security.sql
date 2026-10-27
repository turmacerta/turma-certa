-- Turma Certa · 007
-- RLS multi-tenant. O backend usa service role (bypassa RLS) e ainda
-- filtra por organização. Estas policies protegem acesso direto via anon key.

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and profile_id = auth.uid()
  );
$$;

create or replace function public.is_org_staff(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin', 'teacher')
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.units enable row level security;
alter table public.spaces enable row level security;
alter table public.sports enable row level security;
alter table public.class_levels enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_sports enable row level security;
alter table public.class_groups enable row level security;
alter table public.class_schedules enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_credits enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.billing_plans enable row level security;
alter table public.student_subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.vacancy_alerts enable row level security;

drop policy if exists "profiles_self_access" on public.profiles;
create policy "profiles_self_access" on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "organizations_member_select" on public.organizations;
create policy "organizations_member_select" on public.organizations
  for select
  using (public.is_org_member(id));

drop policy if exists "organizations_owner_update" on public.organizations;
create policy "organizations_owner_update" on public.organizations
  for update
  using (public.is_org_staff(id));

drop policy if exists "members_select" on public.organization_members;
create policy "members_select" on public.organization_members
  for select
  using (profile_id = auth.uid() or public.is_org_staff(organization_id));

drop policy if exists "units_staff" on public.units;
create policy "units_staff" on public.units
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "spaces_staff" on public.spaces;
create policy "spaces_staff" on public.spaces
  for all
  using (
    exists (
      select 1 from public.units u
      where u.id = unit_id and public.is_org_staff(u.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.units u
      where u.id = unit_id and public.is_org_staff(u.organization_id)
    )
  );

drop policy if exists "sports_staff" on public.sports;
create policy "sports_staff" on public.sports
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "levels_staff" on public.class_levels;
create policy "levels_staff" on public.class_levels
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "students_staff" on public.students;
create policy "students_staff" on public.students
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "students_self" on public.students;
create policy "students_self" on public.students
  for select
  using (profile_id = auth.uid());

drop policy if exists "teachers_staff" on public.teachers;
create policy "teachers_staff" on public.teachers
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "teacher_sports_staff" on public.teacher_sports;
create policy "teacher_sports_staff" on public.teacher_sports
  for all
  using (
    exists (
      select 1 from public.teachers t
      where t.id = teacher_id and public.is_org_staff(t.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.teachers t
      where t.id = teacher_id and public.is_org_staff(t.organization_id)
    )
  );

drop policy if exists "class_groups_member" on public.class_groups;
create policy "class_groups_member" on public.class_groups
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "class_groups_staff_write" on public.class_groups;
create policy "class_groups_staff_write" on public.class_groups
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "class_schedules_member" on public.class_schedules;
create policy "class_schedules_member" on public.class_schedules
  for select
  using (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_member(g.organization_id)
    )
  );

drop policy if exists "class_schedules_staff_write" on public.class_schedules;
create policy "class_schedules_staff_write" on public.class_schedules
  for all
  using (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  );

drop policy if exists "enrollments_staff" on public.enrollments;
create policy "enrollments_staff" on public.enrollments
  for all
  using (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  );

drop policy if exists "credits_staff" on public.lesson_credits;
create policy "credits_staff" on public.lesson_credits
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "sessions_member" on public.class_sessions;
create policy "sessions_member" on public.class_sessions
  for select
  using (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_member(g.organization_id)
    )
  );

drop policy if exists "sessions_staff_write" on public.class_sessions;
create policy "sessions_staff_write" on public.class_sessions
  for all
  using (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  );

drop policy if exists "attendance_staff" on public.attendance;
create policy "attendance_staff" on public.attendance
  for all
  using (
    exists (
      select 1 from public.class_sessions s
      join public.class_groups g on g.id = s.class_group_id
      where s.id = class_session_id and public.is_org_staff(g.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_sessions s
      join public.class_groups g on g.id = s.class_group_id
      where s.id = class_session_id and public.is_org_staff(g.organization_id)
    )
  );

drop policy if exists "billing_plans_staff" on public.billing_plans;
create policy "billing_plans_staff" on public.billing_plans
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "subscriptions_staff" on public.student_subscriptions;
create policy "subscriptions_staff" on public.student_subscriptions
  for all
  using (
    exists (
      select 1 from public.students s
      where s.id = student_id and public.is_org_staff(s.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = student_id and public.is_org_staff(s.organization_id)
    )
  );

drop policy if exists "invoices_staff" on public.invoices;
create policy "invoices_staff" on public.invoices
  for all
  using (public.is_org_staff(organization_id))
  with check (public.is_org_staff(organization_id));

drop policy if exists "vacancy_alerts_staff" on public.vacancy_alerts;
create policy "vacancy_alerts_staff" on public.vacancy_alerts
  for all
  using (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_groups g
      where g.id = class_group_id and public.is_org_staff(g.organization_id)
    )
  );
