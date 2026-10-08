import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "./supabase/server";

type AppRole="student"|"teacher"|"admin";
const loginPath=(role:AppRole)=>role==="admin"?"/admin/login":role==="teacher"?"/professor/login":"/aceder";

export async function requireActiveRole(role:AppRole){
  const supabase=await createSupabaseServerClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(loginPath(role));
  const {data:profile}=await supabase.from("user_profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||profile.role!==role)redirect("/");
  return {user,supabase};
}

export async function requireRole(role:AppRole){
  const {user,supabase}=await requireActiveRole(role);
  if(role==="admin"||role==="teacher"){
    const [{data:aal},{data:factors}]=await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors()
    ]);
    const hasVerifiedTotp=Boolean(factors?.totp?.some(f=>f.status==="verified"));
    if(!hasVerifiedTotp||aal?.currentLevel!=="aal2")redirect(role==="admin"?"/admin/mfa":"/professor/mfa");
  }
  return user;
}
