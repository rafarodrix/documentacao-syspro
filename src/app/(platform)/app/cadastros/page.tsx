import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/CadastrosContainer"

export default async function ClientCadastrosPage() {
    const { companies, users, error } = await getCadastrosData()

    if (error) return <div>Erro: {error}</div>

    return (
        <CadastrosContainer
            companies={companies || []}
            users={users || []}
            isAdmin={false} // Modo restrito (cliente)
        />
    )
}