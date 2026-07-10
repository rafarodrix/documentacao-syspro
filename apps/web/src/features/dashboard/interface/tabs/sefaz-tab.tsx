import type { DashboardSefazStatus } from "@dosc-syspro/contracts/dashboard";
import { SectionCard } from "@/components/patterns";
import { SefazOperationsPanel } from "@/components/sefaz/sefaz-operations-panel";
import { callWebApi } from "@/lib/web-api";
import { DashboardNextActionCard } from "../components/dashboard-next-action-card";

function isDegraded(status?: DashboardSefazStatus["status"] | null) {
  return status === "UNSTABLE" || status === "OFFLINE";
}

export async function SefazTab({ canViewAvailability }: { canViewAvailability: boolean }) {
  const res = await callWebApi("/api/dashboard/sefaz");
  const body = await res.json().catch(() => null);
  const sefazData = body?.data;
  const focusUfs = sefazData?.focusUfs ?? [];
  const scopedStatuses = sefazData?.sefazStatuses ?? [];
  const nationalStatuses = sefazData?.sefazNationalStatuses ?? [];
  const configuredRoutes = sefazData?.sefazConfiguredRoutes ?? [];
  const activeRoutes = configuredRoutes.filter((route: { active: boolean }) => route.active);
  const degradedRoutes = scopedStatuses.filter((status: DashboardSefazStatus) => isDegraded(status.status));
  const hasSefazData = activeRoutes.length > 0 || scopedStatuses.length > 0 || nationalStatuses.length > 0;

  if (!hasSefazData) {
    return (
      <SectionCard title="Monitor SEFAZ indisponivel" className="border-border/50 bg-card">
        <p className="text-sm text-muted-foreground">
          Nenhuma rota fiscal ativa ou leitura recente foi encontrada para este escopo.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-5">
      <SefazOperationsPanel
        focusUfs={focusUfs}
        scopedStatuses={scopedStatuses}
        nationalStatuses={nationalStatuses}
        configuredRoutes={configuredRoutes}
        canViewAvailability={canViewAvailability}
      />

      <DashboardNextActionCard
        description="Feche a leitura revisando as rotas fiscais configuradas e abra tratamento operacional imediato quando houver degradacao em ambiente critico."
        primaryHref="/portal/configuracoes"
        primaryLabel="Revisar configuracoes fiscais"
        secondaryHref="/portal/tickets/novo"
        secondaryLabel="Abrir incidente"
      />
    </div>
  );
}
