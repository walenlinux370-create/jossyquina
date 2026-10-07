"use client";
import {useState} from "react";
type A={id:string;class_id:string;subject_id:string;academic_year:number;class_label:string;subject_label:string};
type S={id:string;full_name:string;registration_number:string;class_id:string};
export function TeacherAttendanceMaterials({assignments,students}:{assignments:A[];students:S[]}){
 const [aid,setAid]=useState(assignments[0]?.id??""),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[present,setPresent]=useState<Record<string,boolean>>({}),[title,setTitle]=useState(""),[path,setPath]=useState(""),[mime,setMime]=useState("application/pdf"),[size,setSize]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 const a=assignments.find(x=>x.id===aid), scoped=students.filter(s=>s.class_id===a?.class_id);
 async function saveAttendance(){
  if(!a||!scoped.length){setMsg("Selecione uma alocação com alunos.");return} setBusy(true);
  const r=await fetch("/api/professor/attendance",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({class_id:a.class_id,subject_id:a.subject_id,attendance_date:date,records:scoped.map(s=>({student_id:s.id,present:present[s.id]??false}))})});
  setBusy(false);setMsg(r.ok?"Frequência guardada.":"Não foi possível guardar a frequência.");
 }
 async function addMaterial(){
  if(!a||!title||!path||!size){setMsg("Preencha os dados do material.");return} setBusy(true);
  const r=await fetch("/api/professor/materials",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({class_id:a.class_id,subject_id:a.subject_id,title,storage_path:path,mime_type:mime,size_bytes:Number(size)})});
  setBusy(false);setMsg(r.ok?"Material publicado para a turma.":"Não foi possível publicar o material.");
  if(r.ok){setTitle("");setPath("");setSize("")}
 }
 return <section className="mt-10 grid gap-6 lg:grid-cols-2">
  <div className="card p-6"><h2 className="text-2xl font-black">Frequência</h2>
   <select className="mt-4 w-full rounded-lg border px-3 py-2" value={aid} onChange={e=>setAid(e.target.value)}><option value="">Selecionar alocação</option>{assignments.map(x=><option value={x.id} key={x.id}>{x.class_label} • {x.subject_label}</option>)}</select>
   <input className="mt-3 w-full rounded-lg border px-3 py-2" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
   <div className="mt-4 space-y-2 max-h-80 overflow-auto">{scoped.map(s=><label className="flex items-center justify-between rounded-lg border p-3" key={s.id}><span>{s.full_name}<small className="block text-slate-500">{s.registration_number}</small></span><input type="checkbox" checked={present[s.id]??false} onChange={e=>setPresent({...present,[s.id]:e.target.checked})}/></label>)}</div>
   <button className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50" disabled={busy} onClick={saveAttendance}>Guardar frequência</button>
  </div>
  <div className="card p-6"><h2 className="text-2xl font-black">Materiais</h2><select className="mt-4 w-full rounded-lg border px-3 py-2" value={aid} onChange={e=>setAid(e.target.value)}><option value="">Selecionar alocação</option>{assignments.map(x=><option value={x.id} key={x.id}>{x.class_label} • {x.subject_label}</option>)}</select>
   <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Título do material" value={title} onChange={e=>setTitle(e.target.value)}/>
   <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Caminho do ficheiro no Storage" value={path} onChange={e=>setPath(e.target.value)}/>
   <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Tamanho em bytes" type="number" value={size} onChange={e=>setSize(e.target.value)}/>
   <select className="mt-3 w-full rounded-lg border px-3 py-2" value={mime} onChange={e=>setMime(e.target.value)}><option>application/pdf</option><option>image/jpeg</option><option>image/png</option><option>video/mp4</option><option>application/vnd.openxmlformats-officedocument.wordprocessingml.document</option></select>
   <button className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50" disabled={busy} onClick={addMaterial}>Publicar material</button>
  </div>
  {msg&&<p className="lg:col-span-2 text-sm text-slate-700">{msg}</p>}
 </section>
}