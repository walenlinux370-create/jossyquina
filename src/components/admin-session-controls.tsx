"use client";

import {createSupabaseBrowserClient} from "@/lib/supabase/client";

const supabase=createSupabaseBrowserClient();

export function AdminSessionControls(){
  async function signOut(){
    await supabase.auth.signOut();
    window.location.assign("/admin/login");
  }
  return <button onClick={signOut} className="rounded-lg border-2 border-slate-900 px-4 py-2 text-sm font-black">Sair</button>;
}
