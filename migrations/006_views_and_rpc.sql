-- Turma Certa · 006
-- Visões e funções de domínio usadas pelo backend.

create or replace view public.class_group_occupancy
with (security_invoker = true) as
select
  cg.id as class_group_id,
  cg.organization_id,
  cg.name,
  cg.max_capacity,
  count(e.id) filter (where e.status = 'active')::int as enrolled_count,
  (cg.max_capacity - count(e.id) filter (where e.status = 'active'))::int as vacancies,
  cg.is_active
from public.class_groups cg
left join public.enrollments e on e.class_group_id = cg.id
group by cg.id;

create or replace function public.student_credit_balance(p_student_id uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(quantity), 0)::int
  from public.lesson_credits
  where student_id = p_student_id
    and (expires_at is null or expires_at >= current_date);
$$;

create or replace function public.renew_subscription(p_subscription_id uuid)
returns public.student_subscriptions
language plpgsql
as $$
declare
  sub public.student_subscriptions;
  plan public.billing_plans;
  student_org uuid;
begin
  select * into sub
  from public.student_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'subscription not found';
  end if;

  select * into plan from public.billing_plans where id = sub.billing_plan_id;
  select organization_id into student_org from public.students where id = sub.student_id;

  sub.current_period_start := sub.current_period_end;
  sub.current_period_end := sub.current_period_end + (plan.cycle_days || ' days')::interval;
  sub.status := 'active';

  update public.student_subscriptions
  set
    current_period_start = sub.current_period_start,
    current_period_end = sub.current_period_end,
    status = sub.status
  where id = sub.id;

  insert into public.invoices (
    organization_id,
    student_id,
    student_subscription_id,
    amount_cents,
    status,
    due_date
  ) values (
    student_org,
    sub.student_id,
    sub.id,
    plan.price_cents,
    'pending',
    sub.current_period_start
  );

  if plan.lessons_per_cycle is not null and plan.lessons_per_cycle > 0 then
    insert into public.lesson_credits (
      organization_id,
      student_id,
      kind,
      quantity,
      reason,
      expires_at
    ) values (
      student_org,
      sub.student_id,
      'regular',
      plan.lessons_per_cycle,
      'Renovação de plano',
      sub.current_period_end
    );
  end if;

  return sub;
end;
$$;
