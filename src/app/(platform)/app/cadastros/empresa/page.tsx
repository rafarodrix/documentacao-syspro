import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer"
import { requireRole } from "@/lib/auth-helpers"
import { Role } from "@prisma/client"

export default async function CadastrosEmpresaPage() {
  const session = await requireRole([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN], "/app")
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
