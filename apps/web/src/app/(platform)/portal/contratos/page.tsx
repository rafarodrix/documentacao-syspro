import { redirect } from "next/navigation";

export default function ContratosPage() {
  redirect("/portal/configuracoes?tab=contracts");
}
