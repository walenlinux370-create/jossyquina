import {NextResponse} from "next/server";
import {requireRole} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";

export async function GET() {
  const admin = await requireRole("admin");
  const {data, error} = await supabaseAdmin
    .from("students")
    .select("id,full_name,registration_number,email,contact,guardian_name,guardian_contact,class_id,status,auth_code_issued_at,failed_code_attempts,locked_until,created_at,classes(id,level,name,academic_year)")
    .order("created_at", {ascending:false});
  if (error) return NextResponse.json({error:"unable_to_list"}, {status:500});
  await supabaseAdmin.from("audit_logs").insert({
    actor_user_id: admin.id,
    event_type:"admin_students_list",
    entity_table:"students",
    metadata:{count:data?.length ?? 0}
  });
  return NextResponse.json({students:data ?? []});
}
