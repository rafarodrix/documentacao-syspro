import { redirect } from "next/navigation"
import { getProtectedSession } from "@/lib/auth-helpers"
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access"

export default async function CadastrosRootPage() {
  const session = await getProtectedSession()

  if (!session) {
    redirect("/login")
  }

  if (await currentUserHasAnyPermission(["companies:view", "companies:view_own", "companies:view_all"], { acceptCompanyScope: true })) {
    redirect("/portal/cadastros/empresa")
  }
  if (await currentUserHasAnyPermission(["users:view", "users:view_team", "users:view_all"], { acceptCompanyScope: true })) {
    redirect("/portal/cadastros/usuarios")
  }
  if (await currentUserHasAnyPermission(["contacts:view", "contacts:view_team", "contacts:view_all"], { acceptCompanyScope: true })) {
    redirect("/portal/contatos")
  }

  redirect("/portal")
}
