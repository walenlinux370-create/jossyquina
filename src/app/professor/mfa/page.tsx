import {MfaGate} from "@/components/mfa-gate";

export const metadata={title:"Segurança do Professor"};

export default function Page(){
  return <MfaGate role="teacher" redirectTo="/professor"/>;
}
