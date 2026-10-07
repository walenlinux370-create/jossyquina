-- EDTECH v2.2: teacher scope and grade entry
grant select on public.teacher_assignments to authenticated;

drop policy if exists teacher_assignments_self_read on public.teacher_assignments;
create policy teacher_assignments_self_read on public.teacher_assignments
for select to authenticated
using (
  public.current_role()='admin'
  or teacher_id=auth.uid()
);

drop policy if exists grades_teacher_insert on public.grades;
create policy grades_teacher_insert on public.grades
for insert to authenticated
with check (
  public.current_role()='admin'
  or (
    public.current_role()='teacher'
    and teacher_id=auth.uid()
    and public.is_teacher_assigned(class_id,subject_id,academic_year)
    and exists(
      select 1 from public.students s
      where s.id=student_id and s.class_id=grades.class_id and s.status='active'
    )
  )
);

drop policy if exists grades_teacher_update on public.grades;
create policy grades_teacher_update on public.grades
for update to authenticated
using (
  public.current_role()='admin'
  or (
    public.current_role()='teacher'
    and teacher_id=auth.uid()
    and public.is_teacher_assigned(class_id,subject_id,academic_year)
  )
)
with check (
  public.current_role()='admin'
  or (
    public.current_role()='teacher'
    and teacher_id=auth.uid()
    and public.is_teacher_assigned(class_id,subject_id,academic_year)
  )
);

revoke delete on public.grades from authenticated;
