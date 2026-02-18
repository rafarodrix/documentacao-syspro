import { ToolsHub } from "@/components/platform/tools/ToolsHub";
import { getProtectedSession } from "@/lib/auth-helpers";
import { hasPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";
import { redirect } from "next/navigation";

export default async function ToolsPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;

    if (!hasPermission(role, "tools:view")) {
        redirect("/");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Ferramentas</h1>
                <p className="text-muted-foreground">Utilitarios para facilitar sua gestao.</p>
            </div>
            <ToolsHub basePath="/tools" />
        </div>
    );
}
