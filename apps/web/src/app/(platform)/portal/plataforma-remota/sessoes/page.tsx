import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getRemoteSessions } from "@/features/remote/application/session-queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { RemoteSessionsPanel } from "@/features/remote/interface/sessions-panel";
import { Activity } from "lucide-react";
import type { RemoteSessionStatus } from "@/features/remote/domain/model";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

interface RemoteSessionsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function toSingleParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function RemoteSessionsPage({ searchParams }: RemoteSessionsPageProps) {
  await requireSession();
  if (!(await currentUserHasPermission("tools:all"))) {
    redirect("/portal");
  }

  const tenantScope = await getRemoteTenantScope();
  const params = searchParams ? await searchParams : undefined;
  const statusParam = toSingleParam(params?.status)?.toUpperCase();
  const hostParam = toSingleParam(params?.host);
  const ticketParam = toSingleParam(params?.ticket);
  const pageParam = Number(toSingleParam(params?.page) ?? "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const statusFilter: RemoteSessionStatus | "ACTIVE" | undefined =
    statusParam === "ACTIVE" ||
    statusParam === "REQUESTED" ||
    statusParam === "STARTED" ||
    statusParam === "ENDED" ||
    statusParam === "FAILED" ||
    statusParam === "CANCELLED"
      ? statusParam
      : undefined;

  const { sessions, pagination, hostOptions } = await getRemoteSessions(tenantScope, {
    status: statusFilter,
    hostId: hostParam?.trim() || undefined,
    ticket: ticketParam?.trim() || undefined,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl border border-border/55 bg-background/55 px-5 py-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <Activity className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sessoes e auditoria</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Gestao centralizada de sessoes remotas vinculadas a chamados do portal.
              Acompanhe conexoes ativas e historico de acesso tecnico.
            </p>
          </div>
        </div>
      </div>

      <RemoteSessionsPanel
        sessions={sessions}
        pagination={pagination}
        hostOptions={hostOptions}
        filters={{
          status: statusFilter ?? "ALL",
          hostId: hostParam?.trim() || "",
          ticket: ticketParam?.trim() || "",
        }}
      />
    </div>
  );
}
