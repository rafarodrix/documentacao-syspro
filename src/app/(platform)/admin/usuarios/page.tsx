import { getUsersAction } from "../../../../actions/admin/user-actions";
import { getCompaniesAction } from "../../../../actions/admin/company-actions";

// Componentes
import { UsersPageHeader } from "@/components/platform/admin/usuarios/UsersPageHeader";
import { UserStats } from "@/components/platform/admin/usuarios/UserStats";
import { UsersToolbar } from "@/components/platform/admin/usuarios/UsersToolbar";
import { UsersTable } from "@/components/platform/admin/usuarios/UsersTable";

// Interface para Next.js 15
interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminUsuariosPage(props: PageProps) {
    // 1. Aguarda os parâmetros da URL
    const searchParams = await props.searchParams;

    // 2. Extrai os filtros
    const search = typeof searchParams.q === 'string' ? searchParams.q : undefined;
    const role = typeof searchParams.role === 'string' ? searchParams.role : undefined;

    // 3. Busca dados filtrados
    // Note que passamos o objeto { search, role } para a action
    const [usersRes, companiesRes] = await Promise.all([
        getUsersAction({ search, role }),
        getCompaniesAction()
    ]);

    const users = (usersRes.success && usersRes.data) ? usersRes.data : [];
    const companies = (companiesRes.success && companiesRes.data) ? companiesRes.data : [];
    const companyOptions = companies.map(c => ({ id: c.id, razaoSocial: c.razaoSocial }));

    return (
        <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500 pb-20">

            <UsersPageHeader companyOptions={companyOptions} />

            <section className="space-y-4">
                {/* Passamos os usuários filtrados para as estatísticas também, 
                    ou você pode querer buscar stats globais separadamente */}
                <UserStats users={users} />
            </section>

            <section className="space-y-4">
                <UsersToolbar />
                <UsersTable users={users} companyOptions={companyOptions} />
            </section>

        </div>
    );
}