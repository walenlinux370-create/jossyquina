import {NextResponse} from "next/server";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}) {
  const admin=await requireRole("admin");
  const {id}=await params;
  const {data:before,error:readError}=await supabaseAdmin.from("students")
    .select("id,status,user_id").eq("id",id).maybeSingle();
  if(readError||!before) return NextResponse.json({error:"not_found"},{status:404});

  const {data:after,error}=await supabaseAdmin.from("students").update({
    status:"inactive",locked_until:null,failed_code_attempts:0
  }).eq("id",id).select("id,status,user_id").single();
  if(error||!after) return NextResponse.json({error:"unable_to_deactivate"},{status:500});

  if(after.user_id){
    await supabaseAdmin.auth.admin.updateUserById(after.user_id,{ban_duration:"876000h"});
  }
  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id:admin.id,event_type:"admin_student_deactivated",entity_table:"students",entity_id:id,
    before_data:before,after_data:after
  });
  return NextResponse.json({ok:true});
}
