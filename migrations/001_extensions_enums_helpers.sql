-- Turma Certa · 001
-- Rode no SQL Editor do Supabase, na ordem dos arquivos.
-- Extensões, enums e funções auxiliares.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.saas_plan as enum ('autonomous', 'school');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.member_role as enum ('owner', 'admin', 'teacher', 'student');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.class_format as enum ('group', 'private');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.enrollment_status as enum ('active', 'paused', 'cancelled', 'waitlist');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.attendance_status as enum ('present', 'absent', 'makeup', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.credit_kind as enum ('regular', 'makeup');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.invoice_status as enum ('draft', 'pending', 'paid', 'overdue', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.subscription_status as enum ('active', 'past_due', 'cancelled', 'paused');
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
