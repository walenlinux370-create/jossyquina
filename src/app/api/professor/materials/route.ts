import {NextResponse} from "next/server";
import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

const metadataSchema=z.object({
 class_id:z.string().uuid(),
 subject_id:z.string().uuid(),
 title:z.string().trim().min(2).max(160)
}).strict();

const allowed=new Set([
 "application/pdf","image/jpeg","image/png","video/mp4",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
const ext=new Map([["application/pdf","pdf"],["image/jpeg","jpg"],["image/png","png"],["video/mp4","mp4"],["application/vnd.openxmlformats-officedocument.wordprocessingml.document","docx"]]);

export async function POST(req:Request){
 const teacher=await requireRole("teacher");
 const form=await req.formData().catch(()=>null);
 if(!form)return NextResponse.json({error:"invalid_data"},{status:400});
 const parsed=metadataSchema.safeParse({
   class_id:form.get("class_id"),subject_id:form.get("subject_id"),title:form.get("title")
 });
 const file=form.get("file");
 if(!parsed.success || !(file instanceof File) || file.size<1 || file.size>52428800 || !allowed.has(file.type))
   return NextResponse.json({error:"invalid_file"},{status:400});
 const d=parsed.data;
 const {data:a}=await supabaseAdmin.from("teacher_assignments").select("id")
  .eq("teacher_id",teacher.id).eq("class_id",d.class_id).eq("subject_id",d.subject_id).maybeSingle();
 if(!a)return NextResponse.json({error:"forbidden_scope"},{status:403});

 const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);
 const path=`${d.class_id}/${d.subject_id}/${crypto.randomUUID()}-${safeName || `material.${ext.get(file.type)}`}`;
 const bytes=Buffer.from(await file.arrayBuffer());
 const upload=await supabaseAdmin.storage.from("materials").upload(path,bytes,{contentType:file.type,upsert:false});
 if(upload.error)return NextResponse.json({error:"upload_failed"},{status:400});

 const {data:item,error}=await supabaseAdmin.from("materials").insert({
   class_id:d.class_id,subject_id:d.subject_id,title:d.title,storage_path:path,mime_type:file.type,size_bytes:file.size,created_by:teacher.id
 }).select("id,title,mime_type,size_bytes,created_at").single();
 if(error){
   await supabaseAdmin.storage.from("materials").remove([path]);
   return NextResponse.json({error:"unable_to_save"},{status:400});
 }
 await supabaseAdmin.from("audit_logs").insert({
   actor_user_id:teacher.id,event_type:"material_created",entity_table:"materials",entity_id:item.id,
   metadata:{class_id:d.class_id,subject_id:d.subject_id,size_bytes:file.size,mime_type:file.type}
 });
 return NextResponse.json({material:item},{status:201});
}
