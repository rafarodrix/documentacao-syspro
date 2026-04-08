import { redirect } from "next/navigation"
import { getProtectedSession } from "@/lib/auth-helpers"
import { CADASTROS_ROUTE_RULES, hasAllowedRole } from "@dosc-syspro/core"
import { ContactsHubPage } from "@/components/platform/app/contatos/ContactsHubPage"

export default async function ContatosRootPage() {
  const session = await getProtectedSession()

  if (!session) {
    redirect("/login")
  }

  if (!hasAllowedRole(session.role, CADASTROS_ROUTE_RULES.contatos.allowed)) {
    redirect(CADASTROS_ROUTE_RULES.contatos.redirectIfBlocked)
  }

  return <ContactsHubPage />
}
