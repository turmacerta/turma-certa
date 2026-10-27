-- Turma Certa · 008
-- Permissões da Data API. Necessário se "Automatically expose new tables"
-- estiver desligado. O backend usa service_role; RLS continua valendo para anon.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;

notify pgrst, 'reload schema';
