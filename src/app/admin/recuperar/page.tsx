import {AdminPasswordReset} from "@/components/admin-password-reset";

export const metadata={title:"Recuperar Acesso Administrativo"};

export default function Page(){
  return <main className="container-site py-14">
    <div className="mx-auto max-w-lg">
      <h1 className="text-4xl font-black">Recuperar acesso</h1>
      <p className="mt-3 text-slate-600">Introduza o e-mail administrativo. A resposta é genérica para não revelar se uma conta existe.</p>
      <AdminPasswordReset/>
    </div>
  </main>;
}
