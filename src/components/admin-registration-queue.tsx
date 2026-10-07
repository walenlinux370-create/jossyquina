"use client";
import {useEffect,useState} from "react";

type Req={id:string;full_name:string;contact:string;guardian_name:string;guardian_contact:string;class_level:number;class_name:string;created_at:string};
type ClassRow={id:string;level:number;name:string;academic_year:number};

export function AdminRegistrationQueue(){
 const [items,setItems]=useState<Req[]>([]); const [classes,setClasses]=useState<ClassRow[]>([]);
 const [busy,setBusy]=useState<string|null>(null); const [message,setMessage]=useState("");
 async function load(){
  const [a,b]=await Promise.all([fetch("/api/admin/registrations"),fetch("/api/admin/students")]);
  const ad=await a.json(); setItems(ad.requests??[]);
  const bd=await b.json(); setClasses((bd.students??[]).map(()=>null).filter(Boolean) as ClassRow[]);
 }
 useEffect(()=>{load()},[]);
 async function approve(item:Req){
  const candidates=classes.filter(c=>c.level===item.class_level);
  const classId=candidates[0]?.id;
  const registration=prompt("Número de matrícula/registro do aluno:");
  if(!registration||!classId){setMessage("Crie primeiro uma turma correspondente à classe.");return;}
  setBusy(item.id);setMessage("");
  const res=await fetch("/api/admin/registrations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({request_id:item.id,class_id:classId,registration_number:registration})});
  setBusy(null);
  if(!res.ok){setMessage("Não foi possível aprovar.");return;}
  await load(); setMessage("Inscrição aprovada. O estudante ficou pendente de emissão do código.");
 }
 return <section className="mt-10"><h2 className="text-2xl font-black">Inscrições pendentes</h2>
  <div className="mt-4 space-y-3">{items.map(i=><article className="card p-5" key={i.id}>
   <div><h3 className="font-black">{i.full_name}</h3><p className="text-sm text-slate-600">Classe {i.class_level} • Turma solicitada: {i.class_name}</p><p className="text-sm text-slate-600">Encarregado: {i.guardian_name} • {i.guardian_contact}</p></div>
   <button className="mt-3 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={busy===i.id} onClick={()=>approve(i)}>Aprovar</button>
  </article>)}{!items.length&&<p className="text-sm text-slate-600">Sem inscrições pendentes.</p>}</div>
  {message&&<p className="mt-3 text-sm text-slate-700">{message}</p>}
 </section>
}