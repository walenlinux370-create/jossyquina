import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {AdminStudentActions} from "@/components/admin-student-actions";
import {AdminRegistrationQueue} from "@/components/admin-registration-queue";

export default async function Page(){
  await requireRole("admin");
  const [{data:students},{data:classes}] = await Promise.all([
    supabaseAdmin.from("students").select("id,full_name,registration_number,email,class_id,status,auth_code_issued_at,failed_code_attempts,locked_until,classes(level,name,academic_year)").order("created_at",{ascending:false}),
    supabaseAdmin.from("classes").select("id,level,name,academic_year").order("academic_year",{ascending:false}).order("level",{ascending:true}).order("name",{ascending:true})
  ]);

  const grouped=(classes??[]).reduce<Record<string,Array<{id:string;level:number;name:string;academic_year:number}>>>((acc,c)=>{
    const key=`Classe ${c.level} • ${c.academic_year}`;
    (acc[key]??=[]).push(c);
    return acc;
  },{});

  return <main className="container-site py-10">
    <h1 className="text-4xl font-black">Painel Administrativo</h1>
    <p className="mt-2 text-slate-600">Gestão hierárquica: classe → turma → estudantes. Operações sensíveis são executadas no servidor e auditadas.</p>
    <AdminRegistrationQueue />
    <section className="mt-8 grid gap-5 md:grid-cols-4">
      {["Estudantes","Matriz Curricular","Notícias e Mídia","Auditoria"].map(x=><div className="card p-6" key={x}><h2 className="font-black">{x}</h2><p className="mt-2 text-sm text-slate-600">Operações protegidas por RBAC.</p></div>)}
    </section>
    <section className="mt-10">
      <h2 className="text-2xl font-black">Classes e turmas</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {Object.entries(grouped).map(([key,items])=><div className="card p-4" key={key}><h3 className="font-bold">{key}</h3>{items.map(c=><p className="mt-1 text-sm text-slate-600" key={c.id}>Turma {c.name}</p>)}</div>)}
        {!classes?.length && <p className="text-sm text-slate-600">Nenhuma turma criada ainda.</p>}
      </div>
    </section>
    <section className="mt-10">
      <h2 className="text-2xl font-black">Estudantes</h2>
      <div className="mt-4 space-y-3">
        {(students??[]).map(s=><article className="card p-5" key={s.id}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="font-black">{s.full_name}</h3>
              <p className="text-sm text-slate-600">Registo: {s.registration_number} • {s.email ?? "sem email"}</p>
              <p className="text-sm text-slate-600">Turma: {s.classes ? `${s.classes.name} — ${s.classes.academic_year}` : "sem turma"} • Estado: {s.status}</p>
              <p className="text-xs text-slate-500">Falhas: {s.failed_code_attempts} {s.locked_until ? "• bloqueado temporariamente" : ""}</p>
            </div>
            <AdminStudentActions studentId={s.id} status={s.status}/>
          </div>
        </article>)}
        {!students?.length && <p className="text-sm text-slate-600">Nenhum estudante registado.</p>}
      </div>
    </section>
  </main>;
}