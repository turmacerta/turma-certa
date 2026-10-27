-- Turma Certa · 003
-- Unidades, quadras, esportes, níveis, professores, alunos e turmas.

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists units_organization_idx on public.units (organization_id);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists spaces_unit_idx on public.spaces (unit_id);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.class_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sport_id uuid references public.sports (id) on delete set null,
  name text not null,
  rank int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists class_levels_organization_idx
  on public.class_levels (organization_id);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  document text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  class_level_id uuid references public.class_levels (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_organization_idx on public.students (organization_id);
create index if not exists students_level_idx on public.students (class_level_id);

create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teachers_organization_idx on public.teachers (organization_id);

create table if not exists public.teacher_sports (
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete cascade,
  primary key (teacher_id, sport_id)
);

create table if not exists public.class_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  space_id uuid references public.spaces (id) on delete set null,
  sport_id uuid not null references public.sports (id) on delete restrict,
  teacher_id uuid references public.teachers (id) on delete set null,
  class_level_id uuid references public.class_levels (id) on delete set null,
  name text not null,
  format public.class_format not null default 'group',
  max_capacity int not null default 8 check (max_capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists class_groups_organization_idx
  on public.class_groups (organization_id);
create index if not exists class_groups_teacher_idx on public.class_groups (teacher_id);

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_group_id uuid not null references public.class_groups (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  unique (class_group_id, weekday, starts_at)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_group_id uuid not null references public.class_groups (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status public.enrollment_status not null default 'active',
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  unique (class_group_id, student_id)
);

create index if not exists enrollments_student_idx on public.enrollments (student_id);
create index if not exists enrollments_class_status_idx
  on public.enrollments (class_group_id, status);

drop trigger if exists units_set_updated_at on public.units;
create trigger units_set_updated_at
  before update on public.units
  for each row execute function public.set_updated_at();

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

drop trigger if exists teachers_set_updated_at on public.teachers;
create trigger teachers_set_updated_at
  before update on public.teachers
  for each row execute function public.set_updated_at();

drop trigger if exists class_groups_set_updated_at on public.class_groups;
create trigger class_groups_set_updated_at
  before update on public.class_groups
  for each row execute function public.set_updated_at();
