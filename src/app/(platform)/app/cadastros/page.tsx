import { getCadastrosData } from "@/actions/admin/get-cadastros-data"
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer"
import { getProtectedSession } from "@/lib/auth-helpers"

type CadastrosPageProps = {
    searchParams?: Promise<{ tab?: string }>
}

export default async function AdminCadastrosPage({ searchParams }: CadastrosPageProps) {
    const session = await getProtectedSession();
    const { companies, users, error } = await getCadastrosData()
    const resolvedSearchParams = searchParams ? await searchParams : undefined

    if (error) return <div>Erro: {error}</div>

    return (
        <CadastrosContainer
            companies={companies || []}
            users={users || []}
            currentUserRole={session?.role!}
            initialTab={resolvedSearchParams?.tab}
        />
    )
}
