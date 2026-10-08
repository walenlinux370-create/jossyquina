"use client";

import {useState} from "react";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";

const supabase=createSupabaseBrowserClient();

export function AdminPasswordReset(){
  const [email,setEmail]=useState("");
  const [sent,setSent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);setError("");setSent(false);
    const site=process.env.NEXT_PUBLIC_SITE_URL||window.location.origin;
    const {error:resetError}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
      redirectTo:new URL("/admin/redefinir",site).toString()
    });
    if(resetError)setError("Não foi possível processar o pedido.");
    else setSent(true);
    setBusy(false);
  }

  return <form className="card mt-7 p-7" onSubmit={submit}>
    <label className="block text-sm font-bold">E-mail administrativo
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
    </label>
    <button disabled={busy} className="btn-primary mt-6 w-full">{busy?"A enviar…":"Enviar instruções"}</button>
    {sent&&<p className="mt-4 text-sm font-semibold text-green-700">Se a conta existir, receberá instruções para redefinir a palavra-passe.</p>}
    {error&&<p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}
  </form>;
}
