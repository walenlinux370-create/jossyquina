import {NextResponse} from "next/server";
import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
const schema=z.object({class_id:z.string().uuid(),subject_id:z.string().uuid(),title:z.string().trim().min(2).max(160),storage_path:z.string().trim().min(1).max(500),mime_type:z.string().trim().min(1).max(120),size_bytes:z.number().int().positive().max(52428800)}).strict();
export async function POST(req:Request){
 const teacher=await requireRole("teacher"); const p=schema.safeParse(await req.json().catch(()=>null));
 if(!p.success)return NextResponse.json({error:"invalid_data"},{status:400}); const d=p.data;
 const {data:a}=await supabaseAdmin.from("teacher_assignments").select("id").eq("teacher_id",teacher.id).eq("class_id",d.class_id).eq("subject_id",d.subject_id).maybeSingle();
 if(!a)return NextResponse.json({error:"forbidden_scope"},{status:403});
 const {data:item,error}=await supabaseAdmin.from("materials").insert({...d,created_by:teacher.id}).select("id,title,mime_type,size_bytes,created_at").single();
 if(error)return NextResponse.json({error:"unable_to_save"},{status:400});
 await supabaseAdmin.from("audit_logs").insert({actor_user_id:teacher.id,event_type:"material_created",entity_table:"materials",entity_id:item.id,metadata:{class_id:d.class_id,subject_id:d.subject_id}});
 return NextResponse.json({material:item},{status:201});
}