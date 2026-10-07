-- EDTECH v2.4.1: harden material storage access

-- The application uploads through the server-side API using the service role.
-- Browser clients must not be able to upload or replace arbitrary material objects.
drop policy if exists materials_storage_teacher_insert on storage.objects;
drop policy if exists materials_storage_teacher_update on storage.objects;

drop policy if exists materials_storage_teacher_select on storage.objects;
create policy materials_storage_teacher_select on storage.objects
for select to authenticated
using (
  bucket_id='materials'
  and (
    (select public.current_role())='admin'
    or exists(
      select 1
      from public.materials m
      join public.teacher_assignments a
        on a.class_id=m.class_id and a.subject_id=m.subject_id
      where m.storage_path=name
        and a.teacher_id=auth.uid()
    )
  )
);

drop policy if exists materials_storage_student_select on storage.objects;
create policy materials_storage_student_select on storage.objects
for select to authenticated
using (
  bucket_id='materials'
  and exists(
    select 1
    from public.materials m
    join public.students s on s.class_id=m.class_id
    where m.storage_path=name
      and s.user_id=auth.uid()
      and s.status='active'
  )
);

drop policy if exists materials_storage_delete on storage.objects;
create policy materials_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id='materials'
  and (select public.current_role())='admin'
);
