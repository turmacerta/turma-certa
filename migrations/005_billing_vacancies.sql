-- Turma Certa · 005
-- Planos que a escola vende ao aluno, faturamento, renovação e alerta de vaga.

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  format public.class_format not null,
  lessons_per_cycle int,
  cycle_days int not null default 30 check (cycle_days > 0),
  price_cents int not null check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists billing_plans_organization_idx
  on public.billing_plans (organization_id);

create table if not exists public.student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  billing_plan_id uuid not null references public.billing_plans (id) on delete restrict,
  status public.subscription_status not null default 'active',
  current_period_start date not null,
  current_period_end date not null,
  auto_renew boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_subscriptions_student_idx
  on public.student_subscriptions (student_id);
create index if not exists student_subscriptions_period_end_idx
  on public.student_subscriptions (current_period_end, status);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  student_subscription_id uuid references public.student_subscriptions (id) on delete set null,
  amount_cents int not null check (amount_cents >= 0),
  status public.invoice_status not null default 'pending',
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invoices_organization_due_idx
  on public.invoices (organization_id, due_date);
create index if not exists invoices_status_idx on public.invoices (status);

create table if not exists public.vacancy_alerts (
  id uuid primary key default gen_random_uuid(),
  class_group_id uuid not null references public.class_groups (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  is_active boolean not null default true,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_group_id, student_id)
);

drop trigger if exists student_subscriptions_set_updated_at on public.student_subscriptions;
create trigger student_subscriptions_set_updated_at
  before update on public.student_subscriptions
  for each row execute function public.set_updated_at();
