-- EDTECH v2.4: secure storage for class materials
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('materials','materials',false,52428800,array[
 'application/pdf','image/jpeg','image/png','video/mp4',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists materials_storage_teacher_insert on storage.objects;
create policy materials_storage_teacher_insert on storage.objects
for insert to authenticated
with check (
 bucket_id='materials'
 and (select public.current_role())='teacher'
);

drop policy if exists materials_storage_teacher_select on storage.objects;
create policy materials_storage_teacher_select on storage.objects
for select to authenticated
using (
 bucket_id='materials'
 and (
   (select public.current_role())='admin'
   or exists(
     select 1 from public.materials m
     join public.teacher_assignments a on a.class_id=m.class_id and a.subject_id=m.subject_id
     where m.storage_path=name and a.teacher_id=auth.uid()
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
   where m.storage_path=name and s.user_id=auth.uid() and s.status='active'
 )
);

drop policy if exists materials_storage_teacher_update on storage.objects;
create policy materials_storage_teacher_update on storage.objects
for update to authenticated
using (bucket_id='materials' and (select public.current_role())='teacher')
with check (bucket_id='materials' and (select public.current_role())='teacher');

drop policy if exists materials_storage_delete on storage.objects;
create policy materials_storage_delete on storage.objects
for delete to authenticated
using (bucket_id='materials' and (select public.current_role())='admin');
