import { getCadastrosData } from "@/actions/admin/get-cadastros-data";
import { CadastrosContainer } from "@/components/platform/cadastros/company/CadastrosContainer";
import { getProtectedSession } from "@/lib/auth-helpers";
import { hasAnyPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";
import { redirect } from "next/navigation";

export default async function CadastrosPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;

    // Guard: Precisa de permissao para ver empresas ou usuarios
    if (!hasAnyPermission(role, ["companies:view", "users:view"])) {
        redirect("/dashboard");
    }

    const { companies, users, error } = await getCadastrosData();

    if (error) return <div>Erro: {error}</div>;

    return (
        <CadastrosContainer
            companies={companies || []}
            users={users || []}
            currentUserRole={session.role}
        />
    );
}
