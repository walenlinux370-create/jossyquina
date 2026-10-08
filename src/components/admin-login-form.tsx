"use client";

import {useState} from "react";
import Link from "next/link";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";

const supabase=createSupabaseBrowserClient();

export function AdminLoginForm(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setError("");

    if(password.length<12){
      setError("Não foi possível autenticar. Verifique os dados ou contacte o administrador.");
      setBusy(false);
      return;
    }

    const {error:authError}=await supabase.auth.signInWithPassword({
      email:email.trim().toLowerCase(),
      password
    });

    if(authError){
      setError("Não foi possível autenticar. Verifique os dados ou contacte o administrador.");
      setBusy(false);
      return;
    }

    window.location.assign("/admin");
  }

  return <form className="card mt-7 p-7" onSubmit={submit}>
    <label className="block text-sm font-bold">
      E-mail administrativo
      <input name="email" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <label className="mt-4 block text-sm font-bold">
      Palavra-passe
      <input name="password" type="password" required minLength={12} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <button disabled={busy} className="btn-primary mt-6 w-full">{busy?"A autenticar…":"Entrar no painel"}</button>
    <Link className="mt-4 block text-center text-sm font-bold underline" href="/admin/recuperar">Esqueci a palavra-passe</Link>
    {error&&<p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}
  </form>;
}
