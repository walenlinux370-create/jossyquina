-- Admin and teacher MFA enforcement at the database boundary.
-- AAL2 is required for privileged roles even when a client bypasses the web UI.

do $$
declare
  t text;
begin
  foreach t in array array[
    'students',
    'classes',
    'subjects',
    'teacher_assignments',
    'grades',
    'attendance',
    'schedules',
    'materials',
    'news'
  ] loop
    execute format('drop policy if exists admin_teacher_aal2_select on public.%I',t);
    execute format('create policy admin_teacher_aal2_select on public.%I as restrictive for select to authenticated using (public.current_role() not in (''admin'',''teacher'') or (select auth.jwt()->>''aal'')=''aal2'')',t);

    execute format('drop policy if exists admin_teacher_aal2_insert on public.%I',t);
    execute format('create policy admin_teacher_aal2_insert on public.%I as restrictive for insert to authenticated with check (public.current_role() not in (''admin'',''teacher'') or (select auth.jwt()->>''aal'')=''aal2'')',t);

    execute format('drop policy if exists admin_teacher_aal2_update on public.%I',t);
    execute format('create policy admin_teacher_aal2_update on public.%I as restrictive for update to authenticated using (public.current_role() not in (''admin'',''teacher'') or (select auth.jwt()->>''aal'')=''aal2'') with check (public.current_role() not in (''admin'',''teacher'') or (select auth.jwt()->>''aal'')=''aal2'')',t);

    execute format('drop policy if exists admin_teacher_aal2_delete on public.%I',t);
    execute format('create policy admin_teacher_aal2_delete on public.%I as restrictive for delete to authenticated using (public.current_role() not in (''admin'',''teacher'') or (select auth.jwt()->>''aal'')=''aal2'')',t);
  end loop;
end $$;

drop policy if exists admin_teacher_aal2_storage_select on storage.objects;
create policy admin_teacher_aal2_storage_select on storage.objects
as restrictive for select to authenticated
using (
  (select public.current_role()) not in ('admin','teacher')
  or (select auth.jwt()->>'aal')='aal2'
);

drop policy if exists admin_teacher_aal2_storage_insert on storage.objects;
create policy admin_teacher_aal2_storage_insert on storage.objects
as restrictive for insert to authenticated
with check (
  (select public.current_role()) not in ('admin','teacher')
  or (select auth.jwt()->>'aal')='aal2'
);

drop policy if exists admin_teacher_aal2_storage_update on storage.objects;
create policy admin_teacher_aal2_storage_update on storage.objects
as restrictive for update to authenticated
using (
  (select public.current_role()) not in ('admin','teacher')
  or (select auth.jwt()->>'aal')='aal2'
)
with check (
  (select public.current_role()) not in ('admin','teacher')
  or (select auth.jwt()->>'aal')='aal2'
);

drop policy if exists admin_teacher_aal2_storage_delete on storage.objects;
create policy admin_teacher_aal2_storage_delete on storage.objects
as restrictive for delete to authenticated
using (
  (select public.current_role()) not in ('admin','teacher')
  or (select auth.jwt()->>'aal')='aal2'
);
