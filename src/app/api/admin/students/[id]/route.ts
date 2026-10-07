import {NextResponse} from "next/server";
import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

const updateSchema = z.object({
  full_name:z.string().trim().min(3).max(160).optional(),
  contact:z.string().trim().max(80).optional(),
  guardian_name:z.string().trim().min(3).max(160).optional(),
  guardian_contact:z.string().trim().max(80).optional(),
  class_id:z.string().uuid().optional(),
  status:z.enum(["pending","active","inactive","blocked"]).optional()
}).strict();

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
  const admin=await requireRole("admin");
  const {id}=await params;
  const parsed=updateSchema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"invalid_data"},{status:400});

  const {data:before,error:readError}=await supabaseAdmin
    .from("students").select("id,full_name,contact,guardian_name,guardian_contact,class_id,status")
    .eq("id",id).maybeSingle();
  if(readError||!before) return NextResponse.json({error:"not_found"},{status:404});

  if(parsed.data.class_id){
    const {data:klass}=await supabaseAdmin.from("classes").select("id").eq("id",parsed.data.class_id).maybeSingle();
    if(!klass) return NextResponse.json({error:"invalid_class"},{status:400});
  }

  const {data:after,error}=await supabaseAdmin.from("students").update(parsed.data).eq("id",id)
    .select("id,full_name,registration_number,email,contact,guardian_name,guardian_contact,class_id,status,auth_code_issued_at,failed_code_attempts,locked_until")
    .single();
  if(error||!after) return NextResponse.json({error:"unable_to_update"},{status:500});

  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id:admin.id,event_type:"admin_student_updated",entity_table:"students",entity_id:id,
    before_data:before,after_data:after,metadata:{fields:Object.keys(parsed.data)}
  });
  return NextResponse.json({student:after});
}

export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}) {
  await requireRole("admin");
  const {id}=await params;
  const {data,error}=await supabaseAdmin.from("students")
    .select("id,full_name,registration_number,email,contact,guardian_name,guardian_contact,class_id,status,auth_code_issued_at,failed_code_attempts,locked_until,created_at,classes(id,level,name,academic_year)")
    .eq("id",id).maybeSingle();
  if(error||!data) return NextResponse.json({error:"not_found"},{status:404});
  return NextResponse.json({student:data});
}
