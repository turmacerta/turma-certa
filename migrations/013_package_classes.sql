alter table public.billing_plans
  add column if not exists sport_id uuid references public.sports (id) on delete set null,
  add column if not exists weekly_classes smallint check (weekly_classes between 1 and 7);

notify pgrst, 'reload schema';
