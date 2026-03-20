import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer"
import { requireRole } from "@/lib/auth-helpers"
import { Role } from "@prisma/client"
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access"

export default async function CadastrosUsuariosPage() {
  const session = await requireRole([...CADASTROS_ROUTE_RULES.usuarios.allowed] as Role[], CADASTROS_ROUTE_RULES.usuarios.redirectIfBlocked)
  const { companies, users, error } = await getCadastrosData()

  if (error) return <div>Erro: {error}</div>

  return (
    <CadastrosContainer
      companies={companies || []}
      users={users || []}
      currentUserRole={session?.role!}
      initialTab="usuarios"
      pageTitle="Cadastro de Usuario"
      pageDescription="Cadastre e gerencie usuarios vinculados as empresas."
    />
  )
}
