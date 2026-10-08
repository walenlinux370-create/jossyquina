"use client";

import {useState} from "react";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";

const supabase=createSupabaseBrowserClient();

export function AdminPasswordUpdate(){
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setError("");
    if(password.length<12||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!/[^A-Za-z0-9]/.test(password)){
      setError("A palavra-passe deve ter pelo menos 12 caracteres e incluir maiúsculas, minúsculas, número e símbolo.");
      return;
    }
    if(password!==confirm){setError("As palavras-passe não coincidem.");return;}
    setBusy(true);
    const {error:updateError}=await supabase.auth.updateUser({password});
    setBusy(false);
    if(updateError){setError("Não foi possível atualizar a palavra-passe.");return;}
    setDone(true);
  }

  if(done)return <div className="card mt-7 p-7"><p className="font-bold">Palavra-passe atualizada. Pode entrar no painel administrativo.</p><a className="btn-primary mt-5" href="/admin/login">Ir para o acesso administrativo</a></div>;

  return <form className="card mt-7 p-7" onSubmit={submit}>
    <label className="block text-sm font-bold">Nova palavra-passe
      <input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <label className="mt-4 block text-sm font-bold">Confirmar palavra-passe
      <input type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <button disabled={busy} className="btn-primary mt-6 w-full">{busy?"A atualizar…":"Atualizar palavra-passe"}</button>
    {error&&<p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}
  </form>;
}
