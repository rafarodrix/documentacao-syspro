import { redirect } from "next/navigation"
import { getProtectedSession } from "@/lib/auth-helpers"

export default async function CadastrosRootPage() {
  const session = await getProtectedSession()

  if (!session) {
    redirect("/login")
  }

  if (session.role === "CLIENTE_USER") {
    redirect("/app")
  }

  redirect("/app/cadastros/empresa")
}
