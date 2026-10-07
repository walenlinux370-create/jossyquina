-- EDTECH v2.3: teacher attendance and material management
grant select,insert,update on public.attendance to authenticated;
grant select,insert on public.materials to authenticated;

drop policy if exists attendance_teacher_insert on public.attendance;
create policy attendance_teacher_insert on public.attendance for insert to authenticated
with check (
 public.current_role()='teacher' and teacher_id=auth.uid()
 and public.is_teacher_assigned(class_id,coalesce(subject_id,'00000000-0000-0000-0000-000000000000'::uuid),
     (select academic_year from public.classes c where c.id=class_id))
 and exists(select 1 from public.students s where s.id=student_id and s.class_id=attendance.class_id and s.status='active')
);

drop policy if exists attendance_teacher_update on public.attendance;
create policy attendance_teacher_update on public.attendance for update to authenticated
using (
 public.current_role()='teacher' and teacher_id=auth.uid()
 and exists(select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.class_id=attendance.class_id and (attendance.subject_id is null or a.subject_id=attendance.subject_id))
)
with check (public.current_role()='teacher' and teacher_id=auth.uid());

drop policy if exists materials_teacher_insert on public.materials;
create policy materials_teacher_insert on public.materials for insert to authenticated
with check (
 public.current_role()='teacher' and created_by=auth.uid()
 and exists(select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.class_id=materials.class_id and a.subject_id=materials.subject_id)
);

drop policy if exists materials_teacher_select on public.materials;
create policy materials_teacher_select on public.materials for select to authenticated
using (
 public.current_role()='admin'
 or class_id=public.my_student_id()::uuid
 or exists(select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.class_id=materials.class_id and a.subject_id=materials.subject_id)
);

create index if not exists attendance_teacher_scope_idx on public.attendance(teacher_id,class_id,subject_id,attendance_date);
create index if not exists materials_class_subject_idx on public.materials(class_id,subject_id,created_at desc);
