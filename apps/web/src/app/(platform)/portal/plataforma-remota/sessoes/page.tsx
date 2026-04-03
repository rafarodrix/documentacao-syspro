import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { getRemoteSessions } from "@/features/remote/application/session-queries";
import { RemoteSessionsPanel } from "@/features/remote/interface/sessions-panel";
import { History, Activity } from "lucide-react";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];

export default async function RemoteSessionsPage() {
  await requireRole(ALLOWED_ROLES, "/portal");
  const sessions = await getRemoteSessions({ limit: 50 });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl border border-border/55 bg-background/55 px-5 py-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <Activity className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sessões e Auditoria</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Gestão centralizada de sessões remotas vinculadas a chamados do Zammad. 
              Acompanhe conexões ativas e histórico de acesso técnico.
            </p>
          </div>
        </div>
      </div>

      <RemoteSessionsPanel sessions={sessions} />
    </div>
  );
}
