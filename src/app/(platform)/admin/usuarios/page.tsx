import { getUsersAction } from "../_actions/user-actions";
import { getCompaniesAction } from "../_actions/company-actions";

// Componentes Refatorados
import { UsersPageHeader } from "@/components/platform/admin/usuarios/UsersPageHeader";
import { UserStats } from "@/components/platform/admin/usuarios/UserStats";
import { UsersToolbar } from "@/components/platform/admin/usuarios/UsersToolbar";
import { UsersTable } from "@/components/platform/admin/usuarios/UsersTable";

export default async function AdminUsuariosPage() {
    // 1. Carregamento de dados (Server Side)
    const [usersRes, companiesRes] = await Promise.all([
        getUsersAction(),
        getCompaniesAction()
    ]);

    const users = (usersRes.success && usersRes.data) || [];
    const companies = (companiesRes.success && companiesRes.data) || [];

    // 2. Preparação de Props
    const companyOptions = companies.map(c => ({ id: c.id, razaoSocial: c.razaoSocial }));

    return (
        <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500 pb-20">

            {/* Cabeçalho (Título + Botão Novo) */}
            <UsersPageHeader companyOptions={companyOptions} />

            {/* Dashboard de Métricas */}
            <section className="space-y-4">
                <UserStats users={users} />
            </section>

            {/* Barra de Busca e Filtros */}
            <section className="space-y-4">
                <UsersToolbar />

                {/* Tabela de Dados */}
                <UsersTable users={users} companyOptions={companyOptions} />
            </section>

        </div>
    );
}