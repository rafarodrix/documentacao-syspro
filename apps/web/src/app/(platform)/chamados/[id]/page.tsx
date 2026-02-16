import { getTicketDetailsAction } from "@/actions/tickets/ticket-actions";
import { TicketDetails } from "@/components/platform/tickets/TicketDetails";
import { getProtectedSession } from "@/lib/auth-helpers";
import { hasPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: PageProps) {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const { id } = await params;
    const role = session.role as Role;
    const canManage = hasPermission(role, "tickets:manage");

    const { ticket, articles, error } = await getTicketDetailsAction(id);

    return (
        <TicketDetails
            ticket={ticket}
            articles={articles || []}
            error={error}
            isAdmin={canManage}
        />
    );
}
