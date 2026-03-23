import { redirect } from "next/navigation"
import { getProtectedSession } from "@/lib/auth-helpers"
import { CADASTROS_ROUTE_RULES, hasAllowedRole } from "@/core/config/route-access"

export default async function CadastrosRootPage() {
  const session = await getProtectedSession()

  if (!session) {
    redirect("/login")
  }

  if (!hasAllowedRole(session.role, CADASTROS_ROUTE_RULES.empresa.allowed)) {
    redirect(CADASTROS_ROUTE_RULES.root.redirectIfBlocked)
  }

  redirect(CADASTROS_ROUTE_RULES.root.redirectIfAllowed)
}
