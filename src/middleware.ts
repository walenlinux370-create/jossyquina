import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

export async function middleware(request:NextRequest){
  let response=NextResponse.next({request});
  const supabase=createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {cookies:{
      getAll(){return request.cookies.getAll()},
      setAll(items){
        items.forEach(({name,value,options})=>{
          request.cookies.set(name,value);
          response.cookies.set(name,value,options);
        });
      }
    }}
  );

  const {data:{user}}=await supabase.auth.getUser();
  const path=request.nextUrl.pathname;
  const protectedPath=/^\/(admin|professor|portal)(\/|$)/.test(path);

  if(protectedPath&&!user){
    if(path.startsWith("/api/"))return NextResponse.json({error:"unauthorized"},{status:401});
    const destination=path.startsWith("/admin")?"/admin/login":path.startsWith("/professor")?"/professor/login":"/aceder";
    return NextResponse.redirect(new URL(destination,request.url));
  }

  response.headers.set("X-Robots-Tag","noindex, nofollow");
  return response;
}

export const config={matcher:["/admin/:path*","/professor/:path*","/portal/:path*","/api/:path*"]};
