import {requireRole} from "@/lib/auth";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export default async function Page(){
  const user=await requireRole("student");
  const supabase=await createSupabaseServerClient();
  const {data:student}=await supabase.from("students").select("id,full_name,registration_number,class_id,classes(level,name,academic_year)").eq("user_id",user.id).eq("status","active").maybeSingle();
  if(!student) return <main className="container-site py-14"><h1 className="text-4xl font-black">Portal do Estudante</h1><p className="mt-3 text-slate-600">Não foi possível carregar o perfil da sessão.</p></main>;

  const [gradesResult,attendanceResult,scheduleResult,materialsResult]=await Promise.all([
    supabase.from("grades").select("id,subject_id,trimester,academic_year,final_grade,state,published_at,subjects(name)").eq("student_id",student.id).eq("state","published").order("academic_year",{ascending:false}).order("trimester",{ascending:true}),
    supabase.from("attendance").select("id,attendance_date,present,subject_id,subjects(name)").eq("student_id",student.id).order("attendance_date",{ascending:false}).limit(100),
    supabase.from("schedules").select("id,weekday,starts_at,ends_at,room,subject_id,subjects(name)").order("weekday").order("starts_at"),
    supabase.from("materials").select("id,title,mime_type,size_bytes,created_at,subject_id,subjects(name)").order("created_at",{ascending:false})
  ]);
  const grades=gradesResult.data??[], attendance=attendanceResult.data??[], schedules=scheduleResult.data??[], materials=materialsResult.data??[];\n  const materialsWithLinks=await Promise.all(materials.map(async m=>{ const {data}=await supabase.storage.from("materials").createSignedUrl(m.storage_path,3600); return {...m,download_url:data?.signedUrl??null}; }));
  const present=attendance.filter(a=>a.present).length, absent=attendance.filter(a=>!a.present).length;

  return <main className="container-site py-10">
    <h1 className="text-4xl font-black">Portal do Estudante</h1>
    <p className="mt-2 text-slate-600">{student.full_name} • Registo {student.registration_number}</p>
    <p className="text-sm font-semibold text-slate-500">Classe {student.classes?.level} • Turma {student.classes?.name} • Ano {student.classes?.academic_year}</p>

    <section className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="card p-5"><h2 className="font-black">Notas publicadas</h2><p className="mt-2 text-3xl font-black">{grades.length}</p></div>
      <div className="card p-5"><h2 className="font-black">Presenças</h2><p className="mt-2 text-3xl font-black">{present}</p></div>
      <div className="card p-5"><h2 className="font-black">Faltas</h2><p className="mt-2 text-3xl font-black">{absent}</p></div>
    </section>

    <section className="mt-10"><h2 className="text-2xl font-black">Notas publicadas</h2><div className="mt-4 overflow-x-auto card"><table className="min-w-full text-left text-sm"><thead><tr className="border-b"><th className="p-4">Disciplina</th><th className="p-4">Trimestre</th><th className="p-4">Ano</th><th className="p-4">Nota</th></tr></thead><tbody>
      {grades.map(g=><tr className="border-b last:border-0" key={g.id}><td className="p-4 font-semibold">{g.subjects?.name??"Disciplina"}</td><td className="p-4">{g.trimester}.º</td><td className="p-4">{g.academic_year}</td><td className="p-4 font-black">{g.final_grade??"—"}</td></tr>)}
      {!grades.length&&<tr><td className="p-4 text-slate-600" colSpan={4}>Ainda não existem notas publicadas.</td></tr>}
    </tbody></table></div></section>

    <section className="mt-10"><h2 className="text-2xl font-black">Frequência</h2><div className="mt-4 overflow-x-auto card"><table className="min-w-full text-left text-sm"><thead><tr className="border-b"><th className="p-4">Data</th><th className="p-4">Disciplina</th><th className="p-4">Estado</th></tr></thead><tbody>
      {attendance.map(a=><tr className="border-b last:border-0" key={a.id}><td className="p-4">{a.attendance_date}</td><td className="p-4">{a.subjects?.name??"Geral"}</td><td className="p-4 font-semibold">{a.present?"Presente":"Falta"}</td></tr>)}
      {!attendance.length&&<tr><td className="p-4 text-slate-600" colSpan={3}>Ainda não existem registos de frequência.</td></tr>}
    </tbody></table></div></section>

    <section className="mt-10"><h2 className="text-2xl font-black">Horário da turma</h2><div className="mt-4 grid gap-3 md:grid-cols-2">
      {schedules.map(s=><article className="card p-4" key={s.id}><h3 className="font-black">{s.subjects?.name??"Disciplina"}</h3><p className="mt-1 text-sm text-slate-600">Dia {s.weekday} • {s.starts_at}–{s.ends_at}{s.room?" • Sala "+s.room:""}</p></article>)}
      {!schedules.length&&<p className="text-sm text-slate-600">Ainda não existe horário publicado.</p>}
    </div></section>

    <section className="mt-10"><h2 className="text-2xl font-black">Materiais da turma</h2><div className="mt-4 grid gap-3 md:grid-cols-2">
      {materialsWithLinks.map(m=><article className="card p-4" key={m.id}><h3 className="font-black">{m.title}</h3><p className="mt-1 text-sm text-slate-600">{m.subjects?.name??"Disciplina"} • {m.mime_type} • {Math.ceil(m.size_bytes/1024)} KB</p>{m.download_url&&<a className="mt-3 inline-block rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black" href={m.download_url} target="_blank" rel="noreferrer">Abrir material</a>}</article>)}
      {!materials.length&&<p className="text-sm text-slate-600">Ainda não existem materiais disponíveis.</p>}
    </div></section>
  </main>;
}