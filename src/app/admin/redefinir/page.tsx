import {AdminPasswordUpdate} from "@/components/admin-password-update";

export const metadata={title:"Redefinir Palavra-passe"};

export default function Page(){
  return <main className="container-site py-14">
    <div className="mx-auto max-w-lg">
      <h1 className="text-4xl font-black">Redefinir palavra-passe</h1>
      <p className="mt-3 text-slate-600">Defina uma nova palavra-passe forte para a conta administrativa.</p>
      <AdminPasswordUpdate/>
    </div>
  </main>;
}
