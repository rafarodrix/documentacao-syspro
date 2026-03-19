import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer"
import { getProtectedSession } from "@/lib/auth-helpers"

export default async function CadastrosEmpresaPage() {
  const session = await getProtectedSession()
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
