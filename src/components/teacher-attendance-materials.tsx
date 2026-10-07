"use client";

import {useState} from "react";

type A={
  id:string;
  class_id:string;
  subject_id:string;
  academic_year:number;
  class_label:string;
  subject_label:string;
};
type S={
  id:string;
  full_name:string;
  registration_number:string;
  class_id:string;
};

export function TeacherAttendanceMaterials({assignments,students}:{assignments:A[];students:S[]}){
  const [aid,setAid]=useState(assignments[0]?.id??"");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [present,setPresent]=useState<Record<string,boolean>>({});
  const [title,setTitle]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);

  const a=assignments.find(x=>x.id===aid);
  const scoped=students.filter(s=>s.class_id===a?.class_id);

  async function loadAttendance(){
    if(!a)return;
    setMsg("");
    const r=await fetch(`/api/professor/attendance?class_id=${a.class_id}&subject_id=${a.subject_id}&attendance_date=${date}`);
    const j=await r.json().catch(()=>null);
    if(r.ok){
      setPresent(Object.fromEntries((j?.attendance??[]).map((x:{student_id:string,present:boolean})=>[x.student_id,x.present])));
      setLoaded(true);
    }else{
      setMsg("Não foi possível carregar a frequência.");
    }
  }

  async function saveAttendance(){
    if(!a||!scoped.length){
      setMsg("Selecione uma alocação com alunos.");
      return;
    }
    setBusy(true);
    setMsg("");
    const r=await fetch("/api/professor/attendance",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        class_id:a.class_id,
        subject_id:a.subject_id,
        attendance_date:date,
        records:scoped.map(s=>({student_id:s.id,present:present[s.id]??false}))
      })
    });
    setBusy(false);
    setMsg(r.ok?"Frequência guardada.":"Não foi possível guardar a frequência.");
  }

  async function addMaterial(){
    if(!a||!title.trim()||!file){
      setMsg("Selecione a turma/disciplina, informe o título e escolha um ficheiro.");
      return;
    }
    setBusy(true);
    setMsg("");
    const form=new FormData();
    form.set("class_id",a.class_id);
    form.set("subject_id",a.subject_id);
    form.set("title",title.trim());
    form.set("file",file);
    const r=await fetch("/api/professor/materials",{method:"POST",body:form});
    const j=await r.json().catch(()=>null);
    setBusy(false);
    setMsg(
      r.ok
        ?"Material publicado para a turma."
        :j?.error==="invalid_file"
          ?"Ficheiro inválido ou superior a 50 MB."
          :j?.error==="forbidden_scope"
            ?"Sem permissão para esta turma/disciplina."
            :"Não foi possível publicar o material."
    );
    if(r.ok){
      setTitle("");
      setFile(null);
      const input=document.getElementById("material-file") as HTMLInputElement|null;
      if(input)input.value="";
    }
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h2 className="text-2xl font-black">Frequência</h2>
        <select className="mt-4 w-full rounded-lg border px-3 py-2" value={aid} onChange={e=>{setAid(e.target.value);setLoaded(false);setPresent({});}}>
          <option value="">Selecionar alocação</option>
          {assignments.map(x=><option value={x.id} key={x.id}>{x.class_label} • {x.subject_label}</option>)}
        </select>
        <input className="mt-3 w-full rounded-lg border px-3 py-2" type="date" value={date} onChange={e=>{setDate(e.target.value);setLoaded(false);}}/>
        <button className="mt-3 rounded-lg border px-4 py-2 font-semibold" onClick={loadAttendance}>Carregar lançamento</button>
        {loaded&&<p className="mt-2 text-xs text-slate-500">Registos existentes carregados para esta data.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded border px-3 py-2 text-sm" onClick={()=>setPresent(Object.fromEntries(scoped.map(s=>[s.id,true])))}>Todos presentes</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={()=>setPresent(Object.fromEntries(scoped.map(s=>[s.id,false])))}>Todos ausentes</button>
        </div>
        <div className="mt-4 max-h-80 space-y-2 overflow-auto">
          {scoped.map(s=>(
            <label className="flex items-center justify-between rounded-lg border p-3" key={s.id}>
              <span>{s.full_name}<small className="block text-slate-500">{s.registration_number}</small></span>
              <span className="flex items-center gap-2 text-sm">
                <span>{present[s.id]===true?"Presente":"Ausente"}</span>
                <input aria-label={present[s.id]===true?"Marcar ausente":"Marcar presente"} type="checkbox" checked={present[s.id]??false} onChange={e=>setPresent({...present,[s.id]:e.target.checked})}/>
              </span>
            </label>
          ))}
          {!scoped.length&&<p className="text-sm text-slate-500">Selecione uma alocação com alunos.</p>}
        </div>
        <button className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50" disabled={busy||!a||!scoped.length} onClick={saveAttendance}>Guardar frequência</button>
      </div>

      <div className="card p-6">
        <h2 className="text-2xl font-black">Materiais da turma</h2>
        <p className="mt-2 text-sm text-slate-600">O ficheiro é enviado diretamente para o servidor e guardado no Supabase Storage. O professor não precisa informar o storage_path.</p>
        <select className="mt-4 w-full rounded-lg border px-3 py-2" value={aid} onChange={e=>setAid(e.target.value)}>
          <option value="">Selecionar turma/disciplina</option>
          {assignments.map(x=><option value={x.id} key={x.id}>{x.class_label} • {x.subject_label}</option>)}
        </select>
        <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Título do material" value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/>
        <input id="material-file" className="mt-3 w-full rounded-lg border px-3 py-2" type="file" accept=".pdf,.jpg,.jpeg,.png,.mp4,.docx" onChange={e=>setFile(e.target.files?.[0]??null)}/>
        {file&&<p className="mt-2 text-sm text-slate-600">{file.name} • {(file.size/1024/1024).toFixed(2)} MB</p>}
        <p className="mt-2 text-xs text-slate-500">PDF, DOCX, JPG, PNG ou MP4 • máximo 50 MB.</p>
        <button className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50" disabled={busy||!file||!a} onClick={addMaterial}>{busy?"A publicar…":"Publicar material para a turma"}</button>
      </div>

      {msg&&<p className="lg:col-span-2 text-sm font-semibold text-slate-700">{msg}</p>}
    </section>
  );
}
