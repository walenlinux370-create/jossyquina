import {NextResponse} from "next/server";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

export async function GET(){
  const teacher=await requireRole("teacher");
  const {data,error}=await supabaseAdmin
    .from("teacher_assignments")
    .select("id,academic_year,class_id,subject_id,classes(id,level,name,academic_year),subjects(id,name,min_level,max_level)")
    .eq("teacher_id",teacher.id)
    .order("academic_year",{ascending:false});
  if(error) return NextResponse.json({error:"unable_to_list"},{status:500});
  return NextResponse.json({assignments:data??[]});
}
