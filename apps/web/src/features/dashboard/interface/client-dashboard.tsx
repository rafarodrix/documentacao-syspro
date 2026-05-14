import { ArrowUpRight, BookOpen, Building2, Headset, KeyRound, PlusCircle, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@dosc-syspro/ui";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";
import { OpenTicketsInsights } from "@/components/platform/app/dashboard/open-tickets-insights";
import { SefazOperationsPanel } from "@/components/sefaz/sefaz-operations-panel";
import { TicketsSummary } from "@/features/tickets/interface";
import { TicketPriorityChart } from "@/features/dashboard/interface/components/ticket-priority-chart";
import { DashboardMetricCard } from "@/features/dashboard/interface/components/dashboard-metric-card";
import type { ClientDashboardView } from "@dosc-syspro/contracts/dashboard";

export function ClientDashboard({
  data,
  canViewAvailability,
}: {
  data: ClientDashboardView;
  canViewAvailability: boolean;
}) {
  const hasMultipleCompanies = data.companyCount > 1;
  const previewCompanies = data.companyNames.slice(0, 2).join(" • ");
  const extraCompaniesCount = Math.max(data.companyCount - 2, 0);

  return (
    <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
      <Card className="border-border/50 bg-card/70 shadow-sm">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Painel do cliente
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Acompanhe suporte, operacao e documentacao</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Consolide chamados, disponibilidade e acessos operacionais em um painel unico.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                <Building2 className="h-3.5 w-3.5" />
                {hasMultipleCompanies ? `${data.companyCount} empresas vinculadas` : "Escopo da empresa atual"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                <Users className="h-3.5 w-3.5" />
                {data.companyUsers} usuario(s) vinculado(s)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <Link href="/portal/tickets/new">
                <PlusCircle className="h-4 w-4" />
                Abrir chamado
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/portal/tickets">
                <Headset className="h-4 w-4" />
                Meus chamados
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/portal/docs/cliente">
                <BookOpen className="h-4 w-4" />
                Documentacao
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className={`grid grid-cols-1 gap-4 ${data.dailyPassword ? "md:grid-cols-[1.2fr_1fr_1fr_0.85fr]" : "md:grid-cols-3"}`}>
        <Card className="h-full min-h-[136px] border-border/50 bg-card/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {hasMultipleCompanies ? "Minhas empresas" : "Minha empresa"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tracking-tight">
              {hasMultipleCompanies ? `${data.companyCount} empresas vinculadas` : data.companyName}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {data.companyName === "Sem empresa vinculada"
                ? "Solicite vinculo de empresa ao administrador."
                : hasMultipleCompanies
                  ? `${previewCompanies}${extraCompaniesCount > 0 ? ` +${extraCompaniesCount}` : ""}`
                  : `${data.companyUsers} usuario(s) vinculados`}
            </p>
          </CardContent>
        </Card>

        <DashboardMetricCard
          title="Chamados em aberto"
          value={data.totalOpen}
          helper={`${data.kpis.pending} em desenvolvimento ou testes`}
          icon={Headset as any}
          tone="blue"
        />

        <DashboardMetricCard
          title="Resolvidos"
          value={data.kpis.resolved}
          helper="Historico recente de chamados concluido"
          icon={BookOpen as any}
          tone="emerald"
        />

        {data.dailyPassword ? (
          <Card className="h-full min-h-[136px] border-border/50 bg-card/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <KeyRound className="h-4 w-4 text-amber-500" />
                Senha do dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-center font-mono text-xl font-semibold tracking-[0.16em]">
                {data.dailyPassword.password}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Uso operacional interno.</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <SefazOperationsPanel
        focusUfs={data.sefazFocusUfs ?? []}
        scopedStatuses={data.sefazStatuses ?? []}
        nationalStatuses={data.sefazNationalStatuses ?? []}
        configuredRoutes={data.sefazConfiguredRoutes ?? []}
        canViewAvailability={canViewAvailability}
      />

      <OpenTicketsInsights records={data.openTicketRecords} scopeMode="own" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0">
          <TicketPriorityChart records={data.openTicketRecords} />
        </div>
        <div className="col-span-1 min-w-0 xl:col-span-2">
          <ActivityChart
            title="Atualizacoes de chamados"
            description="Movimento dos seus chamados nos ultimos 7 dias"
            points={data.activity}
            badgeLabel="Meu historico"
            emptyLabel="Nenhuma atualizacao recente"
          />
        </div>
      </div>

      <TicketsSummary tickets={data.tickets} />

      <div className="flex justify-end">
        <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
          <Link href="/portal/tickets">
            Ver todos os chamados
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
