create extension if not exists pgcrypto;
create type public.app_role as enum ('student','teacher','admin');
create type public.account_status as enum ('pending','active','inactive','blocked');
create type public.grade_state as enum ('draft','published');

create table public.user_profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 role public.app_role not null,
 is_active boolean not null default true,
 display_name text not null,
 created_at timestamptz not null default now()
);
create table public.classes(
 id uuid primary key default gen_random_uuid(),
 level smallint not null check(level between 1 and 12),
 name text not null check(length(name) between 1 and 20),
 academic_year smallint not null,
 unique(level,name,academic_year)
);
create table public.students(
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users(id) on delete set null,
 full_name text not null,
 registration_number text not null unique,
 email text,
 contact text,
 guardian_name text not null,
 guardian_contact text not null,
 class_id uuid not null references public.classes(id),
 status public.account_status not null default 'pending',
 auth_code_hash text,
 auth_code_issued_at timestamptz,
 failed_code_attempts smallint not null default 0 check(failed_code_attempts between 0 and 5),
 locked_until timestamptz,
 last_login_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.registration_requests(
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 contact text not null,
 guardian_name text not null,
 guardian_contact text not null,
 class_level smallint not null check(class_level between 1 and 12),
 class_name text not null,
 consent_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create table public.subjects(
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 min_level smallint not null check(min_level between 1 and 12),
 max_level smallint not null check(max_level between min_level and 12)
);
create table public.teacher_assignments(
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.user_profiles(id),
 subject_id uuid not null references public.subjects(id),
 class_id uuid not null references public.classes(id),
 academic_year smallint not null,
 unique(subject_id,class_id,academic_year)
);
create table public.grades(
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id),
 subject_id uuid not null references public.subjects(id),
 class_id uuid not null references public.classes(id),
 trimester smallint not null check(trimester between 1 and 3),
 academic_year smallint not null,
 teacher_id uuid not null references public.user_profiles(id),
 component_scores jsonb not null default '{}'::jsonb,
 final_grade numeric(5,2),
 state public.grade_state not null default 'draft',
 published_at timestamptz,
 created_at timestamptz not null default now(),
 unique(student_id,subject_id,trimester,academic_year)
);
create table public.attendance(
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id),
 class_id uuid not null references public.classes(id),
 subject_id uuid references public.subjects(id),
 attendance_date date not null,
 present boolean not null,
 teacher_id uuid not null references public.user_profiles(id),
 unique(student_id,subject_id,attendance_date)
);
create table public.schedules(
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 subject_id uuid not null references public.subjects(id),
 weekday smallint not null check(weekday between 1 and 7),
 starts_at time not null,
 ends_at time not null,
 room text
);
create table public.materials(
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes(id),
 subject_id uuid not null references public.subjects(id),
 title text not null,
 storage_path text not null unique,
 mime_type text not null,
 size_bytes bigint not null check(size_bytes>0 and size_bytes<=52428800),
 created_by uuid not null references public.user_profiles(id),
 created_at timestamptz not null default now()
);
create table public.news(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 title text not null,
 excerpt text not null,
 body_html text not null,
 video_url text,
 published boolean not null default false,
 published_at timestamptz,
 created_by uuid not null references public.user_profiles(id),
 created_at timestamptz not null default now()
);
create table public.audit_logs(
 id bigint generated always as identity primary key,
 actor_user_id uuid references auth.users(id),
 event_type text not null,
 entity_table text not null,
 entity_id text,
 before_data jsonb,
 after_data jsonb,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index grades_student_published_idx on public.grades(student_id,state);
create index teacher_assignments_teacher_idx on public.teacher_assignments(teacher_id,class_id,subject_id);
create index students_class_idx on public.students(class_id,status);

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path=public as $$
 select role from public.user_profiles where id=auth.uid() and is_active
$$;
create or replace function public.my_student_id() returns uuid
language sql stable security definer set search_path=public as $$
 select id from public.students where user_id=auth.uid() and status='active'
$$;
create or replace function public.is_teacher_assigned(p_class uuid,p_subject uuid,p_year smallint)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.teacher_assignments a where a.teacher_id=auth.uid() and a.class_id=p_class and a.subject_id=p_subject and a.academic_year=p_year)
$$;

create or replace function public.grade_guard() returns trigger
language plpgsql security definer set search_path=public as $$
declare assignment_teacher uuid;
begin
 if tg_op='UPDATE' and (new.student_id<>old.student_id or new.subject_id<>old.subject_id or new.class_id<>old.class_id or new.trimester<>old.trimester or new.academic_year<>old.academic_year or new.teacher_id<>old.teacher_id) then
   raise exception 'grade_identity_immutable';
 end if;
 select teacher_id into assignment_teacher from public.teacher_assignments where subject_id=new.subject_id and class_id=new.class_id and academic_year=new.academic_year;
 if assignment_teacher is null then raise exception 'invalid_assignment'; end if;
 new.teacher_id:=assignment_teacher;
 if new.state='published' and old.state is distinct from 'published' then new.published_at:=now(); end if;
 if new.state='published' and old.state='published' then
   insert into public.audit_logs(actor_user_id,event_type,entity_table,entity_id,before_data,after_data)
   values(auth.uid(),'grade_published_edit','grades',new.id::text,to_jsonb(old),to_jsonb(new));
 end if;
 return new;
end $$;
create trigger grades_guard before insert or update on public.grades for each row execute function public.grade_guard();

create or replace function public.audit_immutable() returns trigger
language plpgsql as $$ begin raise exception 'audit_logs_immutable'; end $$;
create trigger audit_no_update before update or delete on public.audit_logs for each row execute function public.audit_immutable();

create or replace function public.issue_student_auth_code(p_student_id uuid,p_actor uuid)
returns text language plpgsql security definer set search_path=public,extensions as $$
declare chars text:='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; code text:=''; i int; student_user uuid;
begin
 if not exists(select 1 from public.user_profiles where id=p_actor and role='admin' and is_active) then raise exception 'forbidden'; end if;
 select user_id into student_user from public.students where id=p_student_id and status in ('pending','active');
 if student_user is null then raise exception 'student_not_eligible'; end if;
 for i in 1..12 loop code:=code||substr(chars,1+(get_byte(gen_random_bytes(1),0)%length(chars)),1); end loop;
 update public.students set auth_code_hash=crypt(code,gen_salt('bf',12)),auth_code_issued_at=now(),failed_code_attempts=0,locked_until=null,status='active' where id=p_student_id;
 insert into public.audit_logs(actor_user_id,event_type,entity_table,entity_id,metadata) values(p_actor,'student_auth_code_issued','students',p_student_id::text,jsonb_build_object('issued_at',now()));
 return code;
end $$;

create or replace function public.verify_student_login(p_identifier text,p_code text,p_ip inet default null)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare s public.students%rowtype; login_email text;
begin
 select * into s from public.students where status in ('active','blocked') and (registration_number=trim(p_identifier) or lower(email)=lower(trim(p_identifier))) limit 1;
 if s.id is null or s.status='blocked' or (s.locked_until is not null and s.locked_until>now()) then
   insert into public.audit_logs(event_type,entity_table,entity_id,metadata) values('student_login_failed','students',coalesce(s.id::text,'unknown'),jsonb_build_object('reason','generic','ip',p_ip));
   return jsonb_build_object('ok',false);
 end if;
 if s.auth_code_hash is null or crypt(p_code,s.auth_code_hash)<>s.auth_code_hash then
   update public.students set failed_code_attempts=least(failed_code_attempts+1,5),locked_until=case when failed_code_attempts+1>=5 then now()+interval '15 minutes' else locked_until end where id=s.id;
   insert into public.audit_logs(actor_user_id,event_type,entity_table,entity_id,metadata) values(s.user_id,'student_login_failed','students',s.id::text,jsonb_build_object('reason','generic','ip',p_ip));
   return jsonb_build_object('ok',false);
 end if;
 update public.students set failed_code_attempts=0,locked_until=null,last_login_at=now() where id=s.id;
 login_email:=coalesce(s.email,'student+'||s.registration_number||'@students.invalid');
 insert into public.audit_logs(actor_user_id,event_type,entity_table,entity_id,metadata) values(s.user_id,'student_login_success','students',s.id::text,jsonb_build_object('ip',p_ip));
 return jsonb_build_object('ok',true,'login_email',login_email);
end $$;

create or replace function public.set_final_grade(p_grade_id uuid)
returns numeric language plpgsql security definer set search_path=public as $$
declare g public.grades%rowtype; result numeric;
begin
 select * into g from public.grades where id=p_grade_id;
 if g.id is null then raise exception 'not_found'; end if;
 if not public.is_teacher_assigned(g.class_id,g.subject_id,g.academic_year) and public.current_role()<>'admin' then raise exception 'forbidden'; end if;
 result:=least(20,greatest(0,coalesce((select avg((value)::numeric) from jsonb_each_text(g.component_scores)),0)));
 update public.grades set final_grade=result where id=p_grade_id;
 return result;
end $$;

alter table public.user_profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.registration_requests enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.schedules enable row level security;
alter table public.materials enable row level security;
alter table public.news enable row level security;
alter table public.audit_logs enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant usage on schema public to anon,authenticated;
grant select on public.news to anon;
grant select on public.subjects,public.classes,public.user_profiles to authenticated;
grant select on public.grades,public.attendance,public.schedules,public.materials to authenticated;

create policy user_profiles_self on public.user_profiles for select to authenticated using(id=auth.uid());
create policy classes_authenticated on public.classes for select to authenticated using(true);
create policy subjects_authenticated on public.subjects for select to authenticated using(true);
create policy student_self on public.students for select to authenticated using(user_id=auth.uid() and status='active');
create policy grades_student_published on public.grades for select to authenticated using(student_id=public.my_student_id() and state='published');
create policy grades_teacher_select on public.grades for select to authenticated using(public.current_role()='teacher' and public.is_teacher_assigned(class_id,subject_id,academic_year));
create policy grades_teacher_insert on public.grades for insert to authenticated with check(public.current_role()='teacher' and public.is_teacher_assigned(class_id,subject_id,academic_year));
create policy grades_teacher_update on public.grades for update to authenticated using(public.current_role()='teacher' and public.is_teacher_assigned(class_id,subject_id,academic_year)) with check(public.current_role()='teacher' and public.is_teacher_assigned(class_id,subject_id,academic_year));
create policy attendance_student on public.attendance for select to authenticated using(student_id=public.my_student_id());
create policy schedules_student on public.schedules for select to authenticated using(class_id=(select class_id from public.students where id=public.my_student_id()));
create policy materials_student on public.materials for select to authenticated using(class_id=(select class_id from public.students where id=public.my_student_id()));

revoke all on public.audit_logs from anon,authenticated;
revoke all on public.students(auth_code_hash,failed_code_attempts,locked_until) from anon,authenticated;
revoke execute on function public.issue_student_auth_code(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.verify_student_login(text,text,inet) from public,anon,authenticated;
revoke execute on function public.set_final_grade(uuid) from public,anon;
grant execute on function public.verify_student_login(text,text,inet) to service_role;
grant execute on function public.issue_student_auth_code(uuid,uuid) to service_role;
grant execute on function public.set_final_grade(uuid) to authenticated;

insert into public.subjects(name,min_level,max_level) values
('Língua Portuguesa',1,12),('Matemática',1,12),('Ciências Naturais',1,6),('História',1,12),('Geografia',1,12),('Educação Física',1,12),('Educação Visual e Ofícios',1,6),('Física',7,12),('Química',7,12),('Biologia',7,12),('Filosofia',7,12),('Língua Inglesa',7,12),('Francês',7,12),('Agro-Pecuária',7,12)
on conflict(name) do nothing;
