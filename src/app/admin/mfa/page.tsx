import {MfaGate} from "@/components/mfa-gate";

export const metadata={title:"Segurança Administrativa"};

export default function Page(){
  return <MfaGate role="admin" redirectTo="/admin"/>;
}
