import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer"
import { getProtectedSession } from "@/lib/auth-helpers"

export default async function AdminCadastrosPage() {
    const session = await getProtectedSession();
    const { companies, users, error } = await getCadastrosData()

    if (error) return <div>Erro: {error}</div>

    return (
        <CadastrosContainer
            companies={companies || []}
            users={users || []}
            currentUserRole={session?.role!}
        />
    )
}