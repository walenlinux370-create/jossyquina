"use client";

import {useEffect,useState} from "react";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";

type Props={role:"admin"|"teacher";redirectTo:string};
const supabase=createSupabaseBrowserClient();

export function MfaGate({role,redirectTo}:Props){
  const [loading,setLoading]=useState(true);
  const [enrolling,setEnrolling]=useState(false);
  const [factorId,setFactorId]=useState("");
  const [qr,setQr]=useState("");
  const [secret,setSecret]=useState("");
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const {data:userData,error:userError}=await supabase.auth.getUser();
      if(userError||!userData.user){
        window.location.assign(role==="admin"?"/admin/login":"/professor/login");
        return;
      }

      const {data:profile}=await supabase.from("user_profiles").select("role,is_active").eq("id",userData.user.id).maybeSingle();
      if(!profile?.is_active||profile.role!==role){
        await supabase.auth.signOut();
        window.location.assign("/");
        return;
      }

      const {data:factors,error:factorsError}=await supabase.auth.mfa.listFactors();
      if(factorsError||!factors){
        if(!cancelled){setError("Não foi possível carregar a autenticação multifator.");setLoading(false);}
        return;
      }

      const verified=factors.totp.find(f=>f.status==="verified");
      if(verified){
        if(!cancelled){setFactorId(verified.id);setLoading(false);}
        return;
      }

      const {data:enrollment,error:enrollError}=await supabase.auth.mfa.enroll({
        factorType:"totp",
        friendlyName:"Jossyquina "+role
      });
      if(enrollError||!enrollment){
        if(!cancelled){setError("Não foi possível iniciar a configuração do autenticador.");setLoading(false);}
        return;
      }

      if(!cancelled){
        setFactorId(enrollment.id);
        setQr(enrollment.totp.qr_code);
        setSecret(enrollment.totp.secret);
        setEnrolling(true);
        setLoading(false);
      }
    })();
    return()=>{cancelled=true};
  },[role]);

  async function verify(){
    if(!factorId||!/^[0-9]{6}$/.test(code)){
      setError("Introduza o código de 6 dígitos do aplicativo autenticador.");
      return;
    }
    setBusy(true);setError("");

    const challenge=await supabase.auth.mfa.challenge({factorId});
    if(challenge.error||!challenge.data){
      setError("Não foi possível validar o código multifator.");
      setBusy(false);return;
    }

    const result=await supabase.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
    if(result.error){
      setError("Código multifator inválido ou expirado.");
      setBusy(false);return;
    }

    window.location.assign(redirectTo);
  }

  if(loading)return <main className="container-site py-14"><div className="mx-auto max-w-lg card p-7">A preparar a autenticação multifator…</div></main>;

  const label=role==="admin"?"administrador":"professor";

  return <main className="container-site py-14">
    <div className="mx-auto max-w-lg">
      <h1 className="text-4xl font-black">Verificação de segurança</h1>
      <p className="mt-3 text-slate-600">Acesso protegido por TOTP. Esta etapa é obrigatória para {label}.</p>
      {enrolling&&<div className="card mt-7 p-7">
        <h2 className="text-xl font-black">Configurar autenticador</h2>
        <p className="mt-2 text-sm text-slate-600">Digitalize o QR Code com Google Authenticator, Microsoft Authenticator ou outro aplicativo TOTP.</p>
        {qr&&<div className="mt-5 flex justify-center rounded-xl border bg-white p-4"><img src={qr} alt="QR Code para configurar autenticação multifator" className="h-56 w-56"/></div>}
        <p className="mt-4 text-xs text-slate-500">Se não conseguir digitalizar, use esta chave manual: <span className="break-all font-mono">{secret}</span></p>
      </div>}
      {!enrolling&&<div className="card mt-7 p-7"><h2 className="text-xl font-black">Código do autenticador</h2><p className="mt-2 text-sm text-slate-600">Abra o seu aplicativo autenticador e introduza o código atual.</p></div>}
      <div className="card mt-4 p-7">
        <label className="block text-sm font-bold">Código TOTP
          <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="mt-1 w-full rounded-lg border p-3 text-center text-2xl tracking-[.35em]"/>
        </label>
        <button disabled={busy} onClick={verify} className="btn-primary mt-5 w-full">{busy?"A verificar…":"Confirmar e entrar"}</button>
        {error&&<p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}
      </div>
    </div>
  </main>;
}
