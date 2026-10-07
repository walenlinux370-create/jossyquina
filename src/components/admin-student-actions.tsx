"use client";

import {useState} from "react";

export function AdminStudentActions({studentId,status}:{studentId:string;status:string}) {
  const [code,setCode]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  async function issueCode(){
    setBusy(true); setMessage(""); setCode(null);
    const res=await fetch(`/api/admin/students/${studentId}/code`,{method:"POST"});
    const data=await res.json().catch(()=>({}));
    setBusy(false);
    if(!res.ok){setMessage("Não foi possível emitir o código.");return;}
    setCode(data.code);
  }

  async function deactivate(){
    if(!confirm("Desativar este estudante? O acesso será bloqueado.")) return;
    setBusy(true); setMessage("");
    const res=await fetch(`/api/admin/students/${studentId}/deactivate`,{method:"POST"});
    setBusy(false);
    if(!res.ok){setMessage("Não foi possível desativar.");return;}
    window.location.reload();
  }

  return <div className="flex flex-wrap items-center gap-2">
    <button className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={busy} onClick={issueCode}>
      {busy ? "Aguarde..." : "Emitir / regenerar código"}
    </button>
    {status!=="inactive" && <button className="rounded-lg border border-red-300 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50" disabled={busy} onClick={deactivate}>Desativar</button>}
    {code && <span className="rounded-lg bg-black px-3 py-2 font-mono text-sm font-bold tracking-widest text-yellow-300" title="Mostrar apenas uma vez">Código: {code}</span>}
    {message && <span className="text-sm text-red-700">{message}</span>}
  </div>;
}
