import {NextResponse} from "next/server";
import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
const schema=z.object({class_id:z.string().uuid(),subject_id:z.string().uuid().nullable(),attendance_date:z.string().date(),records:z.array(z.object({student_id:z.string().uuid(),present:z.boolean()})).min(1)}).strict();
export async function POST(req:Request){
 const teacher=await requireRole("teacher"); const p=schema.safeParse(await req.json().catch(()=>null));
 if(!p.success)return NextResponse.json({error:"invalid_data"},{status:400}); const d=p.data;
 const {data:assignment}=await supabaseAdmin.from("teacher_assignments").select("id,academic_year").eq("teacher_id",teacher.id).eq("class_id",d.class_id).eq("subject_id",d.subject_id).maybeSingle();
 if(!assignment)return NextResponse.json({error:"forbidden_scope"},{status:403});
 const ids=d.records.map(x=>x.student_id);
 const {data:students}=await supabaseAdmin.from("students").select("id").in("id",ids).eq("class_id",d.class_id).eq("status","active");
 if(!students||students.length!==ids.length)return NextResponse.json({error:"invalid_students"},{status:400});
 const rows=d.records.map(x=>({student_id:x.student_id,class_id:d.class_id,subject_id:d.subject_id,attendance_date:d.attendance_date,present:x.present,teacher_id:teacher.id}));
 const {data,error}=await supabaseAdmin.from("attendance").upsert(rows,{onConflict:"student_id,subject_id,attendance_date"}).select("id,student_id,present,attendance_date");
 if(error)return NextResponse.json({error:"unable_to_save"},{status:400});
 await supabaseAdmin.from("audit_logs").insert({actor_user_id:teacher.id,event_type:"attendance_saved",entity_table:"attendance",metadata:{class_id:d.class_id,subject_id:d.subject_id,date:d.attendance_date,count:rows.length}});
 return NextResponse.json({attendance:data??[]},{status:201});
}