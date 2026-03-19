import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer"
import { requireRole } from "@/lib/auth-helpers"
import { Role } from "@prisma/client"

export default async function CadastrosSistemaPage() {
  const session = await requireRole([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE], "/app")
  const { companies, users, error } = await getCadastrosData()

  if (error) return <div>Erro: {error}</div>

  return (
    <CadastrosContainer
      companies={companies || []}
      users={users || []}
      currentUserRole={session?.role!}
      initialTab="sistema"
      pageTitle="Analista de Sistemas"
      pageDescription="Equipe interna para administracao, suporte e desenvolvimento."
    />
  )
}
