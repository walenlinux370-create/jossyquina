"use client";
import {useState} from "react";

type Assignment={id:string;class_id:string;subject_id:string;academic_year:number;class_label:string;subject_label:string};
type Student={id:string;full_name:string;registration_number:string;class_id:string};

export function TeacherGradeEntry({assignments,students}:{assignments:Assignment[];students:Student[]}){
 const [assignmentId,setAssignmentId]=useState(assignments[0]?.id??"");
 const [studentId,setStudentId]=useState("");
 const [trimester,setTrimester]=useState("1");
 const [score,setScore]=useState("");
 const [state,setState]=useState<"draft"|"published">("draft");
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 const assignment=assignments.find(a=>a.id===assignmentId);
 const scopedStudents=students.filter(s=>s.class_id===assignment?.class_id);
 async function save(){
  if(!assignment||!studentId||score===""){setMessage("Preencha turma/disciplina, aluno e nota.");return}
  setBusy(true);setMessage("");
  const res=await fetch("/api/professor/grades",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   student_id:studentId,subject_id:assignment.subject_id,class_id:assignment.class_id,academic_year:assignment.academic_year,
   trimester:Number(trimester),component_scores:{avaliacao:Number(score)},state
  })});
  const data=await res.json().catch(()=>({}));setBusy(false);
  setMessage(res.ok?`Nota guardada. Nota final: ${data.grade?.final_grade ?? "—"}`:"Não foi possível guardar a nota.");
 }
 return <section className="mt-10 card p-6">
  <h2 className="text-2xl font-black">Lançamento de notas</h2>
  <div className="mt-4 grid gap-3 md:grid-cols-2">
   <select className="rounded-lg border px-3 py-2" value={assignmentId} onChange={e=>{setAssignmentId(e.target.value);setStudentId("")}}>
    <option value="">Selecionar alocação</option>{assignments.map(a=><option value={a.id} key={a.id}>{a.class_label} • {a.subject_label} • {a.academic_year}</option>)}
   </select>
   <select className="rounded-lg border px-3 py-2" value={studentId} onChange={e=>setStudentId(e.target.value)}>
    <option value="">Selecionar aluno</option>{scopedStudents.map(s=><option value={s.id} key={s.id}>{s.full_name} • {s.registration_number}</option>)}
   </select>
   <select className="rounded-lg border px-3 py-2" value={trimester} onChange={e=>setTrimester(e.target.value)}>
    <option value="1">1.º Trimestre</option><option value="2">2.º Trimestre</option><option value="3">3.º Trimestre</option>
   </select>
   <input className="rounded-lg border px-3 py-2" type="number" min="0" max="20" step="0.01" placeholder="Nota 0–20" value={score} onChange={e=>setScore(e.target.value)}/>
   <select className="rounded-lg border px-3 py-2" value={state} onChange={e=>setState(e.target.value as "draft"|"published")}>
    <option value="draft">Guardar como rascunho</option><option value="published">Publicar para o aluno</option>
   </select>
  </div>
  <button className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50" disabled={busy||!assignments.length} onClick={save}>{busy?"A guardar...":"Guardar nota"}</button>
  {message&&<p className="mt-3 text-sm">{message}</p>}
 </section>
}