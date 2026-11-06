-- Rolling 14-day schedule horizon, maintained by pg_cron at midnight America/Sao_Paulo.
-- Requires the pg_cron extension (Supabase: Database → Extensions → pg_cron).
-- On hosted Supabase, pg_cron is available on paid plans; enable the extension first if this fails.

create extension if not exists pg_cron;

create or replace function public.maintain_schedule_horizon()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tz constant text := 'America/Sao_Paulo';
  horizon_days constant int := 14;
  now_utc timestamptz := clock_timestamp();
  start_brt date := (now_utc at time zone tz)::date;
  end_exclusive timestamptz := timezone(tz, ((start_brt + (horizon_days + 1))::timestamp));
  day_offset int;
  day_date date;
  day_weekday int;
  session_starts_at timestamptz;
  session_ends_at timestamptz;
  created_count int := 0;
  removed_count int := 0;
  cancelled_count int := 0;
  class_rec record;
  schedule_rec record;
  session_ids uuid[];
  removable uuid[];
  kept uuid[];
begin
  for class_rec in
    select g.id, g.space_id, g.teacher_id
    from public.class_groups g
    where g.is_active
      and exists (
        select 1 from public.class_schedules s where s.class_group_id = g.id
      )
  loop
    for day_offset in 0..horizon_days loop
      day_date := start_brt + day_offset;
      day_weekday := extract(dow from day_date)::int;

      for schedule_rec in
        select s.starts_at as slot_start, s.ends_at as slot_end
        from public.class_schedules s
        where s.class_group_id = class_rec.id
          and s.weekday = day_weekday
      loop
        session_starts_at := timezone(tz, day_date::timestamp + schedule_rec.slot_start);
        session_ends_at := timezone(tz, day_date::timestamp + schedule_rec.slot_end);

        if session_starts_at <= now_utc or session_starts_at >= end_exclusive then
          continue;
        end if;

        if exists (
          select 1
          from public.class_sessions cs
          where cs.class_group_id = class_rec.id
            and cs.starts_at = session_starts_at
        ) then
          continue;
        end if;

        insert into public.class_sessions (
          class_group_id,
          space_id,
          teacher_id,
          starts_at,
          ends_at
        ) values (
          class_rec.id,
          class_rec.space_id,
          class_rec.teacher_id,
          session_starts_at,
          session_ends_at
        );
        created_count := created_count + 1;
      end loop;
    end loop;
  end loop;

  select coalesce(array_agg(cs.id), '{}'::uuid[])
  into session_ids
  from public.class_sessions cs
  join public.class_groups g on g.id = cs.class_group_id
  where cs.starts_at >= end_exclusive
    and cs.cancelled_at is null
    and g.is_active;

  if coalesce(cardinality(session_ids), 0) > 0 then
    select coalesce(array_agg(a.class_session_id), '{}'::uuid[])
    into kept
    from public.attendance a
    where a.class_session_id = any (session_ids);

    select coalesce(array_agg(id), '{}'::uuid[])
    into removable
    from unnest(session_ids) as id
    where id <> all (kept);

    if coalesce(cardinality(removable), 0) > 0 then
      delete from public.class_sessions where id = any (removable);
      removed_count := cardinality(removable);
    end if;

    if coalesce(cardinality(kept), 0) > 0 then
      update public.class_sessions
      set cancelled_at = now_utc
      where id = any (kept);
      cancelled_count := cardinality(kept);
    end if;
  end if;

  return jsonb_build_object(
    'created', created_count,
    'removed', removed_count,
    'cancelled', cancelled_count,
    'horizon_days', horizon_days,
    'timezone', tz,
    'end_exclusive', end_exclusive
  );
end;
$$;

revoke all on function public.maintain_schedule_horizon() from public;
grant execute on function public.maintain_schedule_horizon() to postgres, service_role;

-- Catch up immediately when the migration runs.
select public.maintain_schedule_horizon();

-- 00:00 America/Sao_Paulo = 03:00 UTC (no DST in Brazil).
do $$
declare
  existing bigint;
begin
  select j.jobid into existing from cron.job j where j.jobname = 'maintain-schedule-horizon' limit 1;
  if existing is not null then
    perform cron.unschedule(existing);
  end if;
exception
  when undefined_table then null;
  when undefined_function then null;
end
$$;

select cron.schedule(
  'maintain-schedule-horizon',
  '0 3 * * *',
  $$select public.maintain_schedule_horizon();$$
);

notify pgrst, 'reload schema';
