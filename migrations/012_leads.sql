create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  school text not null,
  mode text not null check (mode in ('school', 'autonomous')),
  students int,
  managers int,
  teachers int,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_idx on public.leads (created_at desc);

alter table public.leads enable row level security;
