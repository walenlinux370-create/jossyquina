import {NextResponse} from "next/server";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
  const admin=await requireRole("admin");
  const {id}=await params;
  const {data:student,error:readError}=await supabaseAdmin
    .from("students")
    .select("id,user_id,email,registration_number,full_name,status")
    .eq("id",id).maybeSingle();
  if(readError||!student) return NextResponse.json({error:"not_found"},{status:404});
  if(student.status==="inactive") return NextResponse.json({error:"inactive_student"},{status:409});

  let userId=student.user_id as string|null;
  let createdUser=false;
  const loginEmail=student.email?.trim().toLowerCase()||`student+${student.registration_number}@students.invalid`;

  if(!userId){
    const temporaryPassword=`Init-${crypto.randomUUID()}-Aa9!`;
    const {data:created,error:createError}=await supabaseAdmin.auth.admin.createUser({
      email:loginEmail,password:temporaryPassword,email_confirm:true,
      user_metadata:{role:"student",student_id:student.id}
    });
    if(createError||!created.user) return NextResponse.json({error:"unable_to_issue"},{status:500});
    userId=created.user.id; createdUser=true;

    const {error:profileError}=await supabaseAdmin.from("user_profiles").insert({
      id:userId,role:"student",is_active:true,display_name:student.full_name
    });
    if(profileError){
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({error:"unable_to_issue"},{status:500});
    }

    const {error:linkError}=await supabaseAdmin.from("students").update({user_id:userId,email:student.email??loginEmail}).eq("id",student.id);
    if(linkError){
      await supabaseAdmin.from("user_profiles").delete().eq("id",userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({error:"unable_to_issue"},{status:500});
    }
  }

  const {data:code,error}=await supabaseAdmin.rpc("issue_student_auth_code",{
    p_student_id:id,p_actor:admin.id
  });
  if(error||!code){
    if(createdUser&&userId){
      await supabaseAdmin.from("students").update({user_id:null}).eq("id",student.id);
      await supabaseAdmin.from("user_profiles").delete().eq("id",userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    return NextResponse.json({error:"unable_to_issue"},{status:400});
  }

  const {error:authError}=await supabaseAdmin.auth.admin.updateUserById(userId,{password:code,email_confirm:true});
  if(authError){
    return NextResponse.json({error:"unable_to_issue"},{status:500});
  }

  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id:admin.id,event_type:"admin_student_code_ready",
    entity_table:"students",entity_id:student.id,
    metadata:{created_auth_user:createdUser}
  });

  return NextResponse.json({code,login_identifier:student.email||loginEmail},{status:200});
}