import {NextResponse} from "next/server";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

export async function GET(){
  const admin=await requireRole("admin");
  const {data,error}=await supabaseAdmin
    .from("classes")
    .select("id,level,name,academic_year")
    .order("academic_year",{ascending:false})
    .order("level",{ascending:true})
    .order("name",{ascending:true});
  if(error) return NextResponse.json({error:"unable_to_list"},{status:500});
  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id:admin.id,event_type:"admin_classes_list",entity_table:"classes",
    metadata:{count:data?.length??0}
  });
  return NextResponse.json({classes:data??[]});
}
