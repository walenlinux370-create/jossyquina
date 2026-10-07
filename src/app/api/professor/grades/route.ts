import {NextResponse} from "next/server";
import {z} from "zod";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

const schema=z.object({
 student_id:z.string().uuid(),subject_id:z.string().uuid(),class_id:z.string().uuid(),
 academic_year:z.number().int(),trimester:z.number().int().min(1).max(3),
 component_scores:z.record(z.string(),z.number().min(0).max(20)),state:z.enum(["draft","published"])
}).strict();

export async function POST(req:Request){
 const teacher=await requireRole("teacher");
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success) return NextResponse.json({error:"invalid_data"},{status:400});
 const d=parsed.data;
 const {data:assignment}=await supabaseAdmin.from("teacher_assignments").select("id")
  .eq("teacher_id",teacher.id).eq("subject_id",d.subject_id).eq("class_id",d.class_id).eq("academic_year",d.academic_year).maybeSingle();
 if(!assignment) return NextResponse.json({error:"forbidden_scope"},{status:403});
 const {data:student}=await supabaseAdmin.from("students").select("id").eq("id",d.student_id).eq("class_id",d.class_id).eq("status","active").maybeSingle();
 if(!student) return NextResponse.json({error:"student_not_found"},{status:404});
 const {data:grade,error}=await supabaseAdmin.from("grades").upsert({
  student_id:d.student_id,subject_id:d.subject_id,class_id:d.class_id,academic_year:d.academic_year,
  trimester:d.trimester,teacher_id:teacher.id,component_scores:d.component_scores,state:d.state
 },{onConflict:"student_id,subject_id,trimester,academic_year"}).select("id,student_id,subject_id,class_id,academic_year,trimester,component_scores,final_grade,state,published_at").single();
 if(error||!grade) return NextResponse.json({error:"unable_to_save"},{status:400});
 const {data:finalGrade,error:finalError}=await supabaseAdmin.rpc("set_final_grade",{p_grade_id:grade.id});
 if(finalError) return NextResponse.json({error:"unable_to_finalize"},{status:400});
 return NextResponse.json({grade:{...grade,final_grade:finalGrade}},{status:201});
}
