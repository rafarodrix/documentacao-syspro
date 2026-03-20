import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer"
import { requireRole } from "@/lib/auth-helpers"
import { Role } from "@prisma/client"
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access"

export default async function CadastrosEmpresaPage() {
  const session = await requireRole([...CADASTROS_ROUTE_RULES.empresa.allowed] as Role[], CADASTROS_ROUTE_RULES.empresa.redirectIfBlocked)
  const { companies, users, error } = await getCadastrosData()

  if (error) return <div>Erro: {error}</div>

  return (
    <CadastrosContainer
      companies={companies || []}
      users={users || []}
      currentUserRole={session?.role!}
      initialTab="empresa"
      pageTitle="Cadastro de Empresa"
      pageDescription="Gerencie os dados cadastrais e fiscais das organizacoes."
    />
  )
}
