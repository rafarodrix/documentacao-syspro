import { redirect } from "next/navigation";

export default function ContratosPage() {
  redirect("/app/configuracoes?tab=contracts");
}
