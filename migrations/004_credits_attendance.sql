-- Turma Certa · 004
-- Créditos de aula, sessões da agenda e presença / reposição.

create table if not exists public.lesson_credits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  kind public.credit_kind not null default 'regular',
  quantity int not null check (quantity <> 0),
  reason text,
  expires_at date,
  created_at timestamptz not null default now()
);

create index if not exists lesson_credits_student_idx
  on public.lesson_credits (student_id, created_at desc);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_group_id uuid not null references public.class_groups (id) on delete cascade,
  space_id uuid references public.spaces (id) on delete set null,
  teacher_id uuid references public.teachers (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists class_sessions_group_starts_idx
  on public.class_sessions (class_group_id, starts_at);
create index if not exists class_sessions_teacher_starts_idx
  on public.class_sessions (teacher_id, starts_at);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status public.attendance_status not null default 'present',
  makeup_session_id uuid references public.class_sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_session_id, student_id)
);

create index if not exists attendance_student_idx on public.attendance (student_id);
