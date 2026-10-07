-- EDTECH v2.1: enrollment approval workflow
create or replace function public.approve_registration(
  p_request_id uuid,
  p_class_id uuid,
  p_registration_number text,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  r public.registration_requests%rowtype;
  new_student uuid;
  admin_id uuid:=auth.uid();
  class_level smallint;
begin
  if not exists(select 1 from public.user_profiles where id=admin_id and role='admin' and is_active) then
    raise exception 'forbidden';
  end if;

  select * into r from public.registration_requests
  where id=p_request_id and status='pending'
  for update;
  if r.id is null then raise exception 'request_not_found'; end if;

  select level into class_level from public.classes where id=p_class_id;
  if class_level is null or class_level<>r.class_level then raise exception 'invalid_class'; end if;

  if exists(select 1 from public.students where registration_number=trim(p_registration_number)) then
    raise exception 'registration_number_exists';
  end if;

  insert into public.students(
    full_name,registration_number,email,contact,guardian_name,guardian_contact,class_id,status
  ) values(
    r.full_name,trim(p_registration_number),nullif(trim(p_email),''),r.contact,
    r.guardian_name,r.guardian_contact,p_class_id,'pending'
  )
  returning id into new_student;

  update public.registration_requests set status='approved' where id=r.id;

  insert into public.audit_logs(
    actor_user_id,event_type,entity_table,entity_id,before_data,after_data,metadata
  ) values(
    admin_id,'registration_approved','registration_requests',r.id::text,
    to_jsonb(r),jsonb_build_object('student_id',new_student,'class_id',p_class_id),
    jsonb_build_object('registration_number',trim(p_registration_number))
  );

  return new_student;
end $$;

revoke all on function public.approve_registration(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.approve_registration(uuid,uuid,text,text) to service_role;
