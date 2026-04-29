import { requireSession } from "@/lib/auth-helpers";
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies";
import { RecentRecords } from "@/components/platform/app/dashboard/RecentRecords";
import { ActivityChart } from "@/components/platform/app/dashboard/ActivityChart";
import { OpenTicketsInsights } from "@/components/platform/app/dashboard/OpenTicketsInsights";
import { SefazStatusWidget } from "@/components/platform/app/dashboard/SefazStatusWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { MagicCard } from "@/components/magicui/MagicCard";
import { NumberTicker } from "@/components/magicui/NumberTicker";
import { ShineBorder } from "@/components/magicui/ShineBorder";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  DollarSign,
  FileText,
  Headset,
  KeyRound,
  Minus,
  PlusCircle,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { TicketsSummary } from "@/features/tickets/interface";
import { getDashboardData } from "@/features/dashboard/application";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { cn } from "@/lib/utils";
import type { DashboardSefazStatus } from "@dosc-syspro/contracts/dashboard";

type SefazStatusKey = "ONLINE" | "UNSTABLE" | "OFFLINE";

function groupSefazByUF(sefazStatuses: DashboardSefazStatus[]) {
  const ufs = Array.from(new Set(sefazStatuses.map(s => s.uf)));
  return ufs.map(uf => ({
    uf,
    nfe: sefazStatuses.find(s => s.uf === uf && s.service === "NFE"),
    nfce: sefazStatuses.find(s => s.uf === uf && s.service === "NFCE"),
  }));
}

function GrowthIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        Estavel este mes
      </span>
    );
  }

  const positive = value > 0;

  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", positive ? "text-emerald-500" : "text-red-500")}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value} este mes
    </span>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function DashboardMetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | string;
  helper: string;
  icon: typeof Target;
  tone: "blue" | "amber" | "emerald" | "red";
}) {
  const toneClass = {
    blue: "bg-sky-500/10 text-sky-500",
    amber: "bg-amber-500/10 text-amber-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    red: "bg-red-500/10 text-red-500",
  }[tone];

  return (
    <Card className="h-full border-border/50 bg-card/70">
      <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ExecutiveLine({
  label,
  value,
  emphasis = "text-foreground",
}: {
  label: string;
  value: string;
  emphasis?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", emphasis)}>{value}</span>
    </div>
  );
}

function TicketScopeSummaryCard({
  total,
  open,
  inProgress,
}: {
  total: number;
  open: number;
  inProgress: number;
}) {
  return (
    <Card className="border-border/50 bg-card/70 shadow-none">
      <CardHeader className="px-4 pb-1 pt-4">
        <CardTitle className="text-sm text-muted-foreground">Tickets abertos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-0">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</span>
          <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{total}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
          <span className="text-sm text-muted-foreground">Tickets abertos</span>
          <span className="text-base font-semibold tabular-nums text-sky-500">{open}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5">
          <span className="text-sm text-muted-foreground">Tickets em execucao</span>
          <span className="text-base font-semibold tabular-nums text-violet-500">{inProgress}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketSectorSplitCard({
  support,
  development,
  scopeMode = "all",
}: {
  support: number;
  development: number;
  scopeMode?: "all" | "development";
}) {
  const showSupport = scopeMode !== "development";

  return (
    <Card className="border-border/50 bg-card/70 shadow-none">
      <CardHeader className="px-4 pb-1 pt-4">
        <CardTitle className="text-sm text-muted-foreground">Tickets por setor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-0">
        {showSupport ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Suporte</span>
            <span className="text-2xl font-bold tracking-tight tabular-nums text-sky-500">{support}</span>
          </div>
        ) : null}
        <div className={cn("flex items-center justify-between gap-3", showSupport ? "border-t border-border/50 pt-2.5" : "")}>
            <span className="text-sm text-muted-foreground">Desenvolvimento</span>
            <span className="text-2xl font-bold tracking-tight tabular-nums text-violet-500">{development}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const canAccessCrm = await currentUserHasAnyPermission(["crm:view", "crm:manage"], {
    acceptCompanyScope: true,
  });
  const data = await getDashboardData();
  const dailyPassword = data.dailyPassword ?? null;

  if (data.mode === "admin") {
    const adminData = data;
    const canViewCompanies = adminData.canViewCompanies ?? true;
    const canViewContacts = adminData.canViewContacts ?? true;
    const canViewUsers = adminData.canViewUsers ?? true;
    const hasCadastrosAccess = canViewCompanies || canViewContacts || canViewUsers;
    const cadastroTabsCount = [canViewCompanies, canViewContacts, canViewUsers].filter(Boolean).length;
    const showUsersMetric = canViewUsers;
    const showPeopleMetric = canViewUsers || canViewContacts;
    const recentContacts = adminData.recentContacts ?? [];
    const recentUsers = adminData.recentUsers ?? [];
    const sefazGroups = groupSefazByUF(adminData.sefazStatuses || []);
    const adminTicketScopeMode = session.role === "DEVELOPER" ? "development" : "all";
    const allowAdminTicketAreaFilter = session.role === "ADMIN";
    const scopedOpenTicketRecords =
      adminTicketScopeMode === "development"
        ? adminData.openTicketRecords.filter((record) => record.team === "DESENVOLVIMENTO")
        : adminData.openTicketRecords;
    const openTicketsNow = scopedOpenTicketRecords.length;
    const openTicketsSupport = scopedOpenTicketRecords.filter((record) => record.team === "SUPORTE").length;
    const openTicketsDevelopment = scopedOpenTicketRecords.filter((record) => record.team === "DESENVOLVIMENTO").length;
    const openTicketsWaiting = scopedOpenTicketRecords.filter((record) => record.status === "Aberto").length;
    const openTicketsInProgress = scopedOpenTicketRecords.filter((record) => record.status !== "Aberto").length;
    return (
      <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
        <Tabs defaultValue="operacional" className="space-y-4">
          <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
            <TabsTrigger value="operacional" className="gap-2 px-4 py-2">
              <Zap className="h-4 w-4" />
              Operacional
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {sefazGroups.length + 2}
              </span>
            </TabsTrigger>
            {hasCadastrosAccess ? (
              <TabsTrigger value="cadastros" className="gap-2 px-4 py-2">
                <Building2 className="h-4 w-4" />
                Cadastros
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {cadastroTabsCount}
                </span>
              </TabsTrigger>
            ) : null}
            {canAccessCrm ? (
              <TabsTrigger value="comercial" className="gap-2 px-4 py-2">
                <Target className="h-4 w-4" />
                Comercial
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {adminData.crm?.activeLeads ?? 0}
                </span>
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="operacional" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {sefazGroups.map(({ uf, nfe, nfce }) => (
                <SefazStatusWidget key={uf} uf={uf} nfe={nfe} nfce={nfce} />
              ))}

              {/* CARDS DE CADASTROS MOVIDOS PARA ABA CADASTROS */}

              <Card className="border-border/50 bg-muted/30 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                    <KeyRound className="h-4 w-4 text-amber-500" />
                    Senha do dia
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-lg border border-border/50 bg-background/80 px-3 py-2 text-center font-mono text-lg font-semibold tracking-[0.16em]">
                    {dailyPassword?.password ?? "-----"}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Uso operacional interno do dia.</p>
                </CardContent>
              </Card>

              <TicketScopeSummaryCard
                total={openTicketsNow}
                open={openTicketsWaiting}
                inProgress={openTicketsInProgress}
              />

              <TicketSectorSplitCard
                support={openTicketsSupport}
                development={openTicketsDevelopment}
                scopeMode={adminTicketScopeMode}
              />
            </div>

            <OpenTicketsInsights
              records={adminData.openTicketRecords}
              scopeMode={adminTicketScopeMode}
              allowAreaFilter={allowAdminTicketAreaFilter}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="min-w-0">
                <TicketsSummary tickets={adminData.tickets} totalOpen={adminData.totalOpen} />
              </div>
              <div className="min-w-0">
                <ActivityChart
                  title="Atualizacoes de tickets"
                  description="Movimento operacional dos ultimos 7 dias"
                  points={adminData.activity}
                  badgeLabel="Fila operacional"
                  emptyLabel="Sem atividade recente no periodo"
                />
              </div>
            </div>

              {/* RECENT RECORDS MOVIDOS PARA ABA CADASTROS */}
          </TabsContent>

          {canAccessCrm ? (
          <TabsContent value="comercial" className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Métricas de Contratos e Receita</h3>
            <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DashboardMetricCard
                title="Contratos Ativos"
                value={adminData.contracts?.activeContracts ?? 0}
                helper="Clientes com contrato ativo"
                icon={FileText as any}
                tone="blue"
              />
              <DashboardMetricCard
                title="MRR Estimado"
                value={adminData.contracts ? formatCurrency(adminData.contracts.totalValue) : "Sem dados"}
                helper="Receita recorrente mensal"
                icon={DollarSign as any}
                tone="emerald"
              />
            </div>

            <h3 className="mt-6 text-sm font-medium text-muted-foreground">Pipeline CRM</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DashboardMetricCard
                title="Pipeline ativo"
                value={adminData.crm?.activeLeads ?? 0}
                helper={adminData.crm ? formatCurrency(adminData.crm.pipelineValue) : "Sem dados"}
                icon={Target as any}
                tone="blue"
              />
              <DashboardMetricCard
                title="Em proposta"
                value={adminData.crm?.proposalLeads ?? 0}
                helper={`${adminData.crm?.negotiationLeads ?? 0} em negociacao`}
                icon={TrendingUp as any}
                tone="amber"
              />
              <DashboardMetricCard
                title="Ganhos"
                value={adminData.crm?.wonLeads ?? 0}
                helper={adminData.crm ? formatCurrency(adminData.crm.wonValue) : "Sem dados"}
                icon={Sparkles as any}
                tone="emerald"
              />
              <DashboardMetricCard
                title="Risco operacional"
                value={(adminData.crm?.overdueLeads ?? 0) + (adminData.crm?.noNextStepLeads ?? 0)}
                helper={`${adminData.crm?.overdueLeads ?? 0} atrasados â€¢ ${adminData.crm?.noNextStepLeads ?? 0} sem proximo passo`}
                icon={TrendingDown as any}
                tone="red"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
              <Card className="border-border/50 bg-card/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Distribuicao do funil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(adminData.crm?.stageDistribution ?? []).map((item) => {
                    const maxCount = Math.max(...(adminData.crm?.stageDistribution ?? [{ count: 1 }]).map((entry) => entry.count), 1);
                    const width = `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 0)}%`;
                    return (
                      <div key={item.stage} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="tabular-nums text-muted-foreground">{item.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/60">
                          <div className="h-2 rounded-full bg-primary/70" style={{ width }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Leitura executiva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <ExecutiveLine label="Leads ativos" value={`${adminData.crm?.activeLeads ?? 0}`} emphasis="text-foreground" />
                  <ExecutiveLine label="Propostas abertas" value={`${adminData.crm?.proposalLeads ?? 0}`} />
                  <ExecutiveLine label="Em negociacao" value={`${adminData.crm?.negotiationLeads ?? 0}`} />
                  <ExecutiveLine label="Perdidos" value={`${adminData.crm?.lostLeads ?? 0}`} />
                  <ExecutiveLine label="Atrasados" value={`${adminData.crm?.overdueLeads ?? 0}`} emphasis={(adminData.crm?.overdueLeads ?? 0) > 0 ? "text-amber-500" : "text-foreground"} />
                  <ExecutiveLine label="Sem proximo passo" value={`${adminData.crm?.noNextStepLeads ?? 0}`} emphasis={(adminData.crm?.noNextStepLeads ?? 0) > 0 ? "text-red-500" : "text-foreground"} />
                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full gap-2">
                      <Link href="/portal/comercial/leads">
                        <ArrowUpRight className="h-4 w-4" />
                        Abrir CRM Comercial
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          ) : null}

          {hasCadastrosAccess ? (
          <TabsContent value="cadastros" className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {canViewCompanies ? (
                <Card className="relative h-full overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
                  <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
                    <Building2 className="h-20 w-20 -rotate-12 text-blue-500" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Empresas Ativas</CardTitle>
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-3xl font-bold tracking-tight tabular-nums">{adminData.cadastros?.companies.total.toLocaleString("pt-BR") ?? adminData.companiesCount.toLocaleString("pt-BR")}</div>
                    <div className="mt-2 flex items-center justify-between text-xs border-t border-border/40 pt-2">
                      <span className="flex items-center gap-1 font-medium text-emerald-500">
                        <TrendingUp className="h-3 w-3" /> +{adminData.cadastros?.companies.registeredThisMonth ?? 0} no mês
                      </span>
                      <span className="flex items-center gap-1 font-medium text-red-500">
                        <TrendingDown className="h-3 w-3" /> -{adminData.cadastros?.companies.inactivatedThisMonth ?? 0} inativ.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {canViewContacts ? (
                <Card className="relative h-full overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
                  <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
                    <Users className="h-20 w-20 rotate-12 text-orange-500" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contatos Vinculados</CardTitle>
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10">
                      <Users className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-3xl font-bold tracking-tight tabular-nums">
                      {(adminData.cadastros?.contacts.total ?? adminData.contactsCount ?? 0).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs border-t border-border/40 pt-2">
                      <span className="flex items-center gap-1 font-medium text-emerald-500">
                        <TrendingUp className="h-3 w-3" /> +{adminData.cadastros?.contacts.registeredThisMonth ?? 0} no mês
                      </span>
                      <span className="flex items-center gap-1 font-medium text-red-500">
                        <TrendingDown className="h-3 w-3" /> -{adminData.cadastros?.contacts.inactivatedThisMonth ?? 0} inativ.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {canViewUsers ? (
                <Card className="relative h-full overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
                  <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
                    <Users className="h-20 w-20 rotate-12 text-violet-500" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Usuários Ativos</CardTitle>
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10">
                      <Users className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-3xl font-bold tracking-tight tabular-nums">
                      {(adminData.cadastros?.users.total ?? adminData.usersCount ?? 0).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs border-t border-border/40 pt-2">
                      <span className="flex items-center gap-1 font-medium text-emerald-500">
                        <TrendingUp className="h-3 w-3" /> +{adminData.cadastros?.users.registeredThisMonth ?? 0} no mês
                      </span>
                      <span className="flex items-center gap-1 font-medium text-red-500">
                        <TrendingDown className="h-3 w-3" /> -{adminData.cadastros?.users.inactivatedThisMonth ?? 0} inativ.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <h3 className="mt-6 text-sm font-medium text-muted-foreground">Últimos Cadastros</h3>
            <div className={cn("grid grid-cols-1 gap-4", canViewUsers || canViewCompanies || canViewContacts ? "xl:grid-cols-3" : "xl:grid-cols-1")}>
              {canViewCompanies ? <RecentCompanies companies={adminData.companies} /> : null}
              {canViewContacts ? (
                <RecentRecords
                  title="Ultimos contatos cadastrados"
                  description="Contatos recentes dentro do seu escopo"
                  emptyTitle="Nenhum contato cadastrado"
                  emptyDescription="Novos contatos aparecerao aqui assim que forem criados."
                  viewAllHref="/portal/contatos"
                  createHref="/portal/contatos/novo"
                  createLabel="Cadastrar contato"
                  icon="contact"
                  items={recentContacts.map((contact) => ({
                    id: contact.id,
                    title: contact.name,
                    subtitle: contact.email || contact.whatsapp || "Sem canal principal",
                    meta: contact.companyNames?.length ? contact.companyNames.join(" • ") : "Sem empresa vinculada",
                    createdAt: contact.createdAt,
                    tags: contact.companyNames?.slice(0, 2),
                  }))}
                />
              ) : null}
              {canViewUsers ? (
                <RecentRecords
                  title="Ultimos usuarios cadastrados"
                  description="Usuarios recentes dentro do seu escopo"
                  emptyTitle="Nenhum usuario cadastrado"
                  emptyDescription="Novos usuarios aparecerao aqui assim que forem criados."
                  viewAllHref="/portal/cadastros/usuarios"
                  createHref="/portal/cadastros/usuarios/novo"
                  createLabel="Novo usuario"
                  icon="user"
                  items={recentUsers.map((user) => ({
                    id: user.id,
                    title: user.name,
                    subtitle: user.email,
                    meta: user.companyNames?.length ? user.companyNames.join(" • ") : user.role,
                    createdAt: user.createdAt,
                    tags: [user.role],
                  }))}
                />
              ) : null}
            </div>

            <h3 className="mt-6 text-sm font-medium text-muted-foreground">Últimas Inativações</h3>
            <div className={cn("grid grid-cols-1 gap-4", canViewUsers || canViewCompanies || canViewContacts ? "xl:grid-cols-3" : "xl:grid-cols-1")}>
              {canViewCompanies ? (
                <RecentCompanies companies={adminData.cadastros?.recentInactivatedCompanies ?? []} />
              ) : null}
              {canViewContacts ? (
                <RecentRecords
                  title="Ultimos contatos inativados"
                  description="Contatos arquivados recentemente"
                  emptyTitle="Nenhuma inativacao"
                  emptyDescription="Contatos inativados aparecerao aqui."
                  viewAllHref="/portal/contatos"
                  createLabel="Ver contatos"
                  icon="contact"
                  items={(adminData.cadastros?.recentInactivatedContacts ?? []).map((contact) => ({
                    id: contact.id,
                    title: contact.name,
                    subtitle: contact.email || contact.whatsapp || "Sem canal principal",
                    meta: contact.companyNames?.length ? contact.companyNames.join(" • ") : "Sem empresa vinculada",
                    createdAt: contact.createdAt,
                    tags: contact.companyNames?.slice(0, 2),
                  }))}
                />
              ) : null}
              {canViewUsers ? (
                <RecentRecords
                  title="Ultimos usuarios inativados"
                  description="Usuarios inativados recentemente"
                  emptyTitle="Nenhuma inativacao"
                  emptyDescription="Usuarios inativados aparecerao aqui."
                  viewAllHref="/portal/cadastros/usuarios"
                  createLabel="Ver usuarios"
                  icon="user"
                  items={(adminData.cadastros?.recentInactivatedUsers ?? []).map((user) => ({
                    id: user.id,
                    title: user.name,
                    subtitle: user.email,
                    meta: user.companyNames?.length ? user.companyNames.join(" • ") : user.role,
                    createdAt: user.createdAt,
                    tags: [user.role],
                  }))}
                />
              ) : null}
            </div>
          </TabsContent>
          ) : null}
        </Tabs>
      </div>
    );
  }

  const hasMultipleCompanies = data.companyCount > 1;
  const previewCompanies = data.companyNames.slice(0, 2).join(" • ");
  const extraCompaniesCount = Math.max(data.companyCount - 2, 0);
  const clientSefazGroups = groupSefazByUF(data.sefazStatuses || []);

  return (
    <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-card via-card to-primary/10 p-5 sm:p-6">
        <ShineBorder borderWidth={1} duration={14} shineColor={["#60a5fa66", "#22d3ee55", "#a78bfa55"]} />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Painel do cliente
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Sua operacao em um so lugar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe chamados, historico e movimentacoes recentes da sua conta.
            </p>
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
              <Link href="/portal/docs">
                <BookOpen className="h-4 w-4" />
                Documentacao
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {clientSefazGroups.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {clientSefazGroups.map(({ uf, nfe, nfce }) => (
            <SefazStatusWidget key={uf} uf={uf} nfe={nfe} nfce={nfce} />
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 gap-4 ${dailyPassword ? "md:grid-cols-[1.2fr_1fr_1fr_0.85fr]" : "md:grid-cols-3"}`}>
        <MagicCard className="rounded-xl">
          <Card className="h-full border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{hasMultipleCompanies ? "Minhas empresas" : "Minha empresa"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">
                {hasMultipleCompanies ? `${data.companyCount} empresas vinculadas` : data.companyName}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {data.companyName === "Sem empresa vinculada"
                  ? "Solicite vinculo de empresa ao administrador."
                  : hasMultipleCompanies
                    ? `${previewCompanies}${extraCompaniesCount > 0 ? ` +${extraCompaniesCount}` : ""}`
                    : `${data.companyUsers} usuario(s) vinculado(s)`}
              </p>
            </CardContent>
          </Card>
        </MagicCard>

        <MagicCard className="rounded-xl">
          <Card className="h-full border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chamados em aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                <NumberTicker value={data.totalOpen} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{data.kpis.pending} em desenvolvimento/testes</p>
            </CardContent>
          </Card>
        </MagicCard>

        <MagicCard className="rounded-xl">
          <Card className="h-full border-border/50 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resolvidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                <NumberTicker value={data.kpis.resolved} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Historico dos tickets recentes</p>
            </CardContent>
          </Card>
        </MagicCard>

        {dailyPassword ? (
          <MagicCard className="rounded-xl">
            <Card className="h-full border-border/50 bg-card/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <KeyRound className="h-4 w-4" />
                  Senha do dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-center font-mono text-xl font-semibold tracking-[0.16em]">
                  {dailyPassword.password}
                </div>
              </CardContent>
            </Card>
          </MagicCard>
        ) : null}
      </div>

      <OpenTicketsInsights records={data.openTicketRecords} scopeMode="own" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="min-w-0">
          <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
        </div>

        <div className="min-w-0">
          <ActivityChart
            title="Atualizacoes de chamados"
            description="Movimento dos seus chamados nos ultimos 7 dias"
            points={data.activity}
            badgeLabel="Meu historico"
            emptyLabel="Nenhuma atualizacao recente"
          />
        </div>
      </div>

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

