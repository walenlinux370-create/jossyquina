import {AdminLoginForm} from "@/components/admin-login-form";

export const metadata={title:"Acesso Administrativo",description:"Acesso seguro ao painel administrativo da Escola Comunitária Jossyquina."};

export default function Page(){
  return <main className="container-site py-14">
    <div className="mx-auto max-w-lg">
      <h1 className="text-4xl font-black">Acesso Administrativo</h1>
      <p className="mt-3 text-slate-600">Use o e-mail e a palavra-passe da conta administrativa. A autenticação multifator TOTP é obrigatória antes de entrar no painel.</p>
      <AdminLoginForm/>
    </div>
  </main>;
}
