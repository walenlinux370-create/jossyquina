import {NextResponse} from "next/server";
import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

const schema=z.object({
  request_id:z.string().uuid(),
  class_id:z.string().uuid(),
  registration_number:z.string().trim().min(3).max(40),
  email:z.string().trim().email().max(160).optional()
}).strict();

export async function GET(){
  await requireRole("admin");
  const {data,error}=await supabaseAdmin.from("registration_requests")
    .select("id,full_name,contact,guardian_name,guardian_contact,class_level,class_name,status,consent_at,created_at")
    .eq("status","pending").order("created_at",{ascending:true});
  if(error) return NextResponse.json({error:"unable_to_list"},{status:500});
  return NextResponse.json({requests:data??[]});
}

export async function POST(req:Request){
  const admin=await requireRole("admin");
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"invalid_data"},{status:400});

  const {data:request,error:requestError}=await supabaseAdmin.from("registration_requests")
    .select("id,status").eq("id",parsed.data.request_id).maybeSingle();
  if(requestError||!request) return NextResponse.json({error:"not_found"},{status:404});
  if(request.status!=="pending") return NextResponse.json({error:"not_pending"},{status:409});

  const {data:studentId,error}=await supabaseAdmin.rpc("approve_registration",{
    p_request_id:parsed.data.request_id,
    p_class_id:parsed.data.class_id,
    p_registration_number:parsed.data.registration_number,
    p_email:parsed.data.email??null,
    p_actor:admin.id
  });
  if(error||!studentId) return NextResponse.json({error:"unable_to_approve"},{status:400});

  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id:admin.id,event_type:"admin_registration_approved",
    entity_table:"registration_requests",entity_id:parsed.data.request_id,
    metadata:{student_id:studentId}
  });
  return NextResponse.json({ok:true,student_id:studentId},{status:201});
}
