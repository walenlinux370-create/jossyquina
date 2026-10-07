-- EDTECH v2: additional curriculum and immutable-audit hardening
create extension if not exists pgcrypto;

insert into public.subjects(name,min_level,max_level) values
('Língua Portuguesa',1,12),
('Matemática',1,12),
('Ciências Naturais',1,6),
('História',1,12),
('Geografia',1,12),
('Educação Física',1,12),
('Educação Visual e Ofícios',1,6),
('Física',7,12),
('Química',7,12),
('Biologia',7,12),
('Filosofia',7,12),
('Língua Inglesa',7,12),
('Francês',7,12),
('Agro-Pecuária',7,12)
on conflict(name) do nothing;

create table if not exists public.student_login_attempts(
 id bigint generated always as identity primary key,
 ip inet not null,
 attempted_at timestamptz not null default now()
);
create index if not exists student_login_attempts_ip_time_idx
 on public.student_login_attempts(ip,attempted_at);

create table if not exists public.admin_notifications(
 id bigint generated always as identity primary key,
 kind text not null,
 student_id uuid references public.students(id) on delete set null,
 message text not null,
 read_at timestamptz,
 created_at timestamptz not null default now()
);

alter table public.student_login_attempts enable row level security;
alter table public.admin_notifications enable row level security;
revoke all on public.student_login_attempts,public.admin_notifications from anon,authenticated;
revoke all on public.audit_logs from anon,authenticated;
revoke update,delete on public.audit_logs from public;

drop policy if exists news_public_read on public.news;
create policy news_public_read on public.news for select
using (published=true or public.current_role()='admin');

drop policy if exists student_self_read on public.students;
create policy student_self_read on public.students for select
using (user_id=auth.uid() and status<>'inactive');

drop policy if exists grade_student_read on public.grades;
create policy grade_student_read on public.grades for select
using (student_id=public.my_student_id() and state='published');

drop policy if exists grade_teacher_read on public.grades;
create policy grade_teacher_read on public.grades for select
using (public.current_role()='admin' or public.is_teacher_assigned(class_id,subject_id,academic_year));

drop policy if exists grade_teacher_insert on public.grades;
create policy grade_teacher_insert on public.grades for insert
with check (
 public.current_role()='admin' or
 (public.current_role()='teacher' and
  public.is_teacher_assigned(class_id,subject_id,academic_year) and
  exists(select 1 from public.students s where s.id=student_id and s.class_id=grades.class_id and s.status='active'))
);

drop policy if exists grade_teacher_update on public.grades;
create policy grade_teacher_update on public.grades for update
using(public.current_role()='admin' or public.is_teacher_assigned(class_id,subject_id,academic_year))
with check(public.current_role()='admin' or public.is_teacher_assigned(class_id,subject_id,academic_year));

drop policy if exists attendance_student_read on public.attendance;
create policy attendance_student_read on public.attendance for select
using(student_id=public.my_student_id());

drop policy if exists schedules_read on public.schedules;
create policy schedules_read on public.schedules for select
using(
 public.current_role()='admin'
 or class_id=(select s.class_id from public.students s where s.user_id=auth.uid() and s.status='active')
 or exists(select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.class_id=schedules.class_id and a.subject_id=schedules.subject_id)
);

drop policy if exists materials_read on public.materials;
create policy materials_read on public.materials for select
using(
 public.current_role()='admin'
 or class_id=(select s.class_id from public.students s where s.user_id=auth.uid() and s.status='active')
 or exists(select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.class_id=materials.class_id and a.subject_id=materials.subject_id)
);

revoke delete on public.grades,public.attendance from authenticated;
revoke all on function public.verify_student_login(text,text,inet) from public,anon,authenticated;
revoke all on function public.issue_student_auth_code(uuid,uuid) from public,anon,authenticated;
revoke all on function public.set_final_grade(uuid) from public,anon,authenticated;

create or replace function public.verify_student_login(p_identifier text,p_code text,p_ip inet default null)
returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare s public.students%rowtype; login_email text; recent_ip int:=0; daily_ip int:=0; failures int;
begin
 if p_ip is not null then
  select count(*) into recent_ip from public.student_login_attempts where ip=p_ip and attempted_at>now()-interval '1 minute';
  select count(*) into daily_ip from public.student_login_attempts where ip=p_ip and attempted_at>now()-interval '24 hours';
  insert into public.student_login_attempts(ip) values(p_ip);
 end if;
 if recent_ip>=5 or daily_ip>=500 then return jsonb_build_object('ok',false); end if;
 select * into s from public.students where status in('active','blocked')
 and(registration_number=trim(p_identifier) or lower(email)=lower(trim(p_identifier))) limit 1;
 if s.id is null or s.status='blocked' or(s.locked_until is not null and s.locked_until>now()) then
  return jsonb_build_object('ok',false);
 end if;
 if s.auth_code_hash is null or crypt(p_code,s.auth_code_hash)<>s.auth_code_hash then
  failures=least(s.failed_code_attempts+1,5);
  update public.students set failed_code_attempts=failures,
   locked_until=case when failures>=5 then now()+interval '15 minutes' else locked_until end where id=s.id;
  if failures>=5 then
   insert into public.admin_notifications(kind,student_id,message)
   values('student_account_locked',s.id,'Conta de estudante bloqueada após tentativas de autenticação.');
  end if;
  insert into public.audit_logs(actor_user_id,event_type,entity_table,entity_id,metadata)
  values(s.user_id,'student_login_failed','students',s.id::text,jsonb_build_object('ip',p_ip,'reason','generic'));
  return jsonb_build_object('ok',false);
 end if;
 update public.students set failed_code_attempts=0,locked_until=null,last_login_at=now() where id=s.id;
 login_email=coalesce(s.email,'student+'||s.registration_number||'@students.invalid');
 insert into public.audit_logs(actor_user_id,event_type,entity_table,entity_id,metadata)
 values(s.user_id,'student_login_success','students',s.id::text,jsonb_build_object('ip',p_ip));
 return jsonb_build_object('ok',true,'login_email',login_email);
end $$;

create or replace function public.issue_student_auth_code(p_student_id uuid,p_actor uuid)
returns text language plpgsql security definer set search_path=public,extensions
as $$
declare chars text:='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; code text:=''; i int;
begin
 if not exists(select 1 from public.user_profiles where id=p_actor and role='admin' and is_active) then raise exception 'forbidden'; end if;
 if not exists(select 1 from public.students where id=p_student_id and status in('pending','active')) then raise exception 'student_not_eligible'; end if;
 for i in 1..12 loop code:=code||substr(chars,1+(get_byte(gen_random_bytes(1),0)%length(chars)),1); end loop;
 update public.students set auth_code_hash=crypt(code,gen_salt('bf',12)),auth_code_issued_at=now(),failed_code_attempts=0,locked_until=null,status='active' where id=p_student_id;
 insert into public.audit_logs(actor_user_id,event_type,entity_table,entity_id,metadata)
 values(p_actor,'student_auth_code_issued','students',p_student_id::text,jsonb_build_object('issued_at',now()));
 return code;
end $$;
