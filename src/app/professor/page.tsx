import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {TeacherGradeEntry} from "@/components/teacher-grade-entry";
import {TeacherAttendanceMaterials} from "@/components/teacher-attendance-materials";

export default async function Page(){
  const teacher=await requireRole("teacher");
  const {data:assignments}=await supabaseAdmin
    .from("teacher_assignments")
    .select("id,academic_year,class_id,subject_id,classes(id,level,name,academic_year),subjects(id,name)")
    .eq("teacher_id",teacher.id)
    .order("academic_year",{ascending:false});

  const classIds=[...new Set((assignments??[]).map(a=>a.class_id))];
  let students:any[]=[];
  if(classIds.length){
    const {data}=await supabaseAdmin.from("students")
      .select("id,full_name,registration_number,class_id,status")
      .in("class_id",classIds).eq("status","active").order("full_name");
    students=data??[];
  }

  return <main className="container-site py-10">
    <h1 className="text-4xl font-black">Painel do Professor</h1>
    <p className="mt-2 text-slate-600">Apenas turmas e disciplinas atribuídas ao seu perfil. O servidor valida novamente cada operação.</p>
    <section className="mt-8 grid gap-4 md:grid-cols-2">
      {(assignments??[]).map(a=><article className="card p-5" key={a.id}>
        <h2 className="font-black">Classe {a.classes?.level} • Turma {a.classes?.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{a.subjects?.name} • Ano {a.academic_year}</p>
      </article>)}
      {!assignments?.length&&<p className="text-sm text-slate-600">Não existem alocações ativas para o seu perfil.</p>}
    </section>
    <TeacherGradeEntry
      assignments={(assignments??[]).map(a=>({id:a.id,class_id:a.class_id,subject_id:a.subject_id,academic_year:a.academic_year,class_label:`Classe ${a.classes?.level} • Turma ${a.classes?.name}`,subject_label:a.subjects?.name??""}))}
      students={(students??[]).map(s=>({id:s.id,full_name:s.full_name,registration_number:s.registration_number,class_id:s.class_id}))}
    />
    <TeacherAttendanceMaterials
      assignments={(assignments??[]).map(a=>({id:a.id,class_id:a.class_id,subject_id:a.subject_id,academic_year:a.academic_year,class_label:`Classe ${a.classes?.level} • Turma ${a.classes?.name}`,subject_label:a.subjects?.name??""}))}
      students={(students??[]).map(s=>({id:s.id,full_name:s.full_name,registration_number:s.registration_number,class_id:s.class_id}))}
    />
  </main>;
}
