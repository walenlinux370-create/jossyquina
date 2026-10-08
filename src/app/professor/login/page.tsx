import {AdminLoginForm} from "@/components/admin-login-form";

export const metadata={title:"Acesso do Professor"};

export default function Page(){
  return <main className="container-site py-14">
    <div className="mx-auto max-w-lg">
      <h1 className="text-4xl font-black">Acesso do Professor</h1>
      <p className="mt-3 text-slate-600">Use a conta institucional de professor. A autenticação multifator TOTP é obrigatória.</p>
      <AdminLoginForm role="teacher"/>
    </div>
  </main>;
}
