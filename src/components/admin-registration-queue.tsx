"use client";
import {useEffect,useState} from "react";

type Req={id:string;full_name:string;contact:string;guardian_name:string;guardian_contact:string;class_level:number;class_name:string;created_at:string};
type ClassRow={id:string;level:number;name:string;academic_year:number};

export function AdminRegistrationQueue(){
 const [items,setItems]=useState<Req[]>([]); const [classes,setClasses]=useState<ClassRow[]>([]);
 const [busy,setBusy]=useState<string|null>(null); const [message,setMessage]=useState("");
 const [selected,setSelected]=useState<Record<string,string>>({}); const [registration,setRegistration]=useState<Record<string,string>>({});
 async function load(){
  const [a,b]=await Promise.all([fetch("/api/admin/registrations"),fetch("/api/admin/classes")]);
  const ad=await a.json(); const bd=await b.json();
  setItems(ad.requests??[]); setClasses(bd.classes??[]);
 }
 useEffect(()=>{load()},[]);
 async function approve(item:Req){
  const classId=selected[item.id]; const reg=registration[item.id]?.trim();
  if(!classId||!reg){setMessage("Selecione a turma e informe o número de matrícula.");return;}
  setBusy(item.id);setMessage("");
  const res=await fetch("/api/admin/registrations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({request_id:item.id,class_id:classId,registration_number:reg})});
  setBusy(null);
  if(!res.ok){setMessage("Não foi possível aprovar a inscrição.");return;}
  setMessage("Inscrição aprovada. O estudante foi criado e está pendente de emissão do código.");
  await load();
 }
 return <section className="mt-10"><h2 className="text-2xl font-black">Inscrições pendentes</h2>
  <div className="mt-4 space-y-3">{items.map(i=>{
   const candidates=classes.filter(c=>c.level===i.class_level);
   return <article className="card p-5" key={i.id}>
    <div><h3 className="font-black">{i.full_name}</h3><p className="text-sm text-slate-600">Classe {i.class_level} • Turma solicitada: {i.class_name}</p><p className="text-sm text-slate-600">Encarregado: {i.guardian_name} • {i.guardian_contact}</p></div>
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      <select className="rounded-lg border px-3 py-2 text-sm" value={selected[i.id]??""} onChange={e=>setSelected({...selected,[i.id]:e.target.value})}>
       <option value="">Selecionar turma</option>{candidates.map(c=><option value={c.id} key={c.id}>Turma {c.name} • {c.academic_year}</option>)}
      </select>
      <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Número de matrícula/registro" value={registration[i.id]??""} onChange={e=>setRegistration({...registration,[i.id]:e.target.value})}/>
    </div>
    <button className="mt-3 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={busy===i.id} onClick={()=>approve(i)}>{busy===i.id?"A aprovar...":"Aprovar inscrição"}</button>
   </article>
  })}{!items.length&&<p className="text-sm text-slate-600">Sem inscrições pendentes.</p>}</div>
  {message&&<p className="mt-3 text-sm text-slate-700">{message}</p>}
 </section>
}