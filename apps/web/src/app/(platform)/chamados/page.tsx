import { getTicketsAction } from "@/actions/tickets/ticket-actions";
import { TicketsContainer } from "@/components/platform/tickets/TicketsContainer";
import { getProtectedSession } from "@/lib/auth-helpers";
import { hasPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";
import { redirect } from "next/navigation";

export default async function ChamadosPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;
    const canViewAll = hasPermission(role, "tickets:view_all");

    const { data, success } = await getTicketsAction();

    if (!success || !data) {
        return (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                <h3 className="font-semibold">Erro ao carregar chamados</h3>
                <p>Verifique sua conexao ou as configuracoes do Zammad.</p>
            </div>
        );
    }

    return <TicketsContainer tickets={data} isAdmin={canViewAll} />;
}
