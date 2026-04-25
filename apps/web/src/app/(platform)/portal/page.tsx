import { requireSession } from "@/lib/auth-helpers";
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies";
import { RecentRecords } from "@/components/platform/app/dashboard/RecentRecords";
import { ActivityChart } from "@/components/platform/app/dashboard/ActivityChart";
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
import { getDashboardData } from "@/features/dashboard/application/queries";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { cn } from "@/lib/utils";

type SefazStatusKey = "ONLINE" | "UNSTABLE" | "OFFLINE";

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
    <Card className="border-border/50 bg-card/70">
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

export default async function DashboardPage() {
  await requireSession();
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
    const showUsersMetric = canViewUsers;
    const showPeopleMetric = canViewUsers || canViewContacts;
    const recentContacts = adminData.recentContacts ?? [];
    const recentUsers = adminData.recentUsers ?? [];
    const sefazStatusMap: Record<SefazStatusKey, { label: string; color: string; dot: string }> = {
      ONLINE: { label: "Operacional", color: "text-emerald-500", dot: "bg-emerald-500" },
      UNSTABLE: { label: "Instavel", color: "text-amber-500", dot: "bg-amber-500" },
      OFFLINE: { label: "Indisponivel", color: "text-red-500", dot: "bg-red-500" },
    };

    const sefazNfeStatus = sefazStatusMap[adminData.sefazNfe.status as SefazStatusKey];
    const sefazNfceStatus = sefazStatusMap[adminData.sefazNfce.status as SefazStatusKey];

    return (
      <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Painel operacional</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Visao operacional do sistema em tempo real.</p>
        </div>

        <Tabs defaultValue="operacional" className="space-y-4">
          <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
            <TabsTrigger value="operacional" className="gap-2 px-4 py-2">
              <Zap className="h-4 w-4" />
              Operacional
            </TabsTrigger>
            {canAccessCrm ? (
              <TabsTrigger value="comercial" className="gap-2 px-4 py-2">
                <Target className="h-4 w-4" />
                Comercial
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="operacional" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card
                className={cn(
                  "border-border/50 bg-card/70",
                  (adminData.sefazNfe.status !== "ONLINE" || adminData.sefazNfce.status !== "ONLINE") && "border-amber-500/30",
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-amber-500" />
                    SEFAZ MG
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">NFe</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                          {adminData.sefazNfe.status === "ONLINE" ? (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          ) : null}
                          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", sefazNfeStatus.dot)} />
                        </span>
                        <span className={cn("text-sm font-semibold", sefazNfeStatus.color)}>{sefazNfeStatus.label}</span>
                      </div>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {adminData.sefazNfe.status === "OFFLINE" || adminData.sefazNfe.latency <= 0 ? "Sem medicao" : `${adminData.sefazNfe.latency}ms`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">NFC-e</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                          {adminData.sefazNfce.status === "ONLINE" ? (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          ) : null}
                          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", sefazNfceStatus.dot)} />
                        </span>
                        <span className={cn("text-sm font-semibold", sefazNfceStatus.color)}>{sefazNfceStatus.label}</span>
                      </div>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {adminData.sefazNfce.status === "OFFLINE" || adminData.sefazNfce.latency <= 0 ? "Sem medicao" : `${adminData.sefazNfce.latency}ms`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {canViewCompanies ? (
                <Card className="relative overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
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
                    <div className="text-3xl font-bold tracking-tight tabular-nums">{adminData.companiesCount.toLocaleString("pt-BR")}</div>
                    <div className="mt-1">
                      <GrowthIndicator value={adminData.companiesGrowth} />
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {showPeopleMetric ? (
                <Card className="relative overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
                  <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
                    <Users className="h-20 w-20 rotate-12 text-violet-500" />
                  </div>
                  <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {showUsersMetric ? "Usuarios" : "Contatos"}
                    </CardTitle>
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10">
                      <Users className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-3xl font-bold tracking-tight tabular-nums">
                      {(showUsersMetric ? adminData.usersCount : (adminData.contactsCount ?? 0)).toLocaleString("pt-BR")}
                    </div>
                    <div className="mt-1">
                      <span className="text-xs text-muted-foreground">
                        {showUsersMetric ? (
                          <><span className="font-medium text-emerald-500">{adminData.activeUsersCount}</span> ativos</>
                        ) : (
                          <><span className="font-medium text-emerald-500">{adminData.contactsCount ?? 0}</span> vinculados ao escopo</>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border-border/50 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <KeyRound className="h-4 w-4" />
                    Senha do dia
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-center font-mono text-xl font-semibold tracking-[0.18em]">
                    {dailyPassword?.password ?? "-----"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <TicketsSummary tickets={adminData.tickets} totalOpen={adminData.totalOpen} />
            </div>

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
                    meta: contact.companyNames?.length ? contact.companyNames.join(" Ã¢â‚¬Â¢ ") : "Sem empresa vinculada",
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
                    meta: user.companyNames?.length ? user.companyNames.join(" Ã¢â‚¬Â¢ ") : user.role,
                    createdAt: user.createdAt,
                    tags: [user.role],
                  }))}
                />
              ) : null}
            </div>
          </TabsContent>

          {canAccessCrm ? (
          <TabsContent value="comercial" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DashboardMetricCard
                title="Pipeline ativo"
                value={adminData.crm?.activeLeads ?? 0}
                helper={adminData.crm ? formatCurrency(adminData.crm.pipelineValue) : "Sem dados"}
                icon={Target}
                tone="blue"
              />
              <DashboardMetricCard
                title="Em proposta"
                value={adminData.crm?.proposalLeads ?? 0}
                helper={`${adminData.crm?.negotiationLeads ?? 0} em negociacao`}
                icon={TrendingUp}
                tone="amber"
              />
              <DashboardMetricCard
                title="Ganhos"
                value={adminData.crm?.wonLeads ?? 0}
                helper={adminData.crm ? formatCurrency(adminData.crm.wonValue) : "Sem dados"}
                icon={Sparkles}
                tone="emerald"
              />
              <DashboardMetricCard
                title="Risco operacional"
                value={(adminData.crm?.overdueLeads ?? 0) + (adminData.crm?.noNextStepLeads ?? 0)}
                helper={`${adminData.crm?.overdueLeads ?? 0} atrasados â€¢ ${adminData.crm?.noNextStepLeads ?? 0} sem proximo passo`}
                icon={TrendingDown}
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
        </Tabs>
      </div>
    );
  }

  const hasMultipleCompanies = data.companyCount > 1;
  const previewCompanies = data.companyNames.slice(0, 2).join(" Ã¢â‚¬Â¢ ");
  const extraCompaniesCount = Math.max(data.companyCount - 2, 0);

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
              <p className="mt-1 text-xs text-muted-foreground">{data.kpis.pending} em analise/pendentes</p>
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

      <div className="relative overflow-hidden rounded-2xl border border-border/50 p-1">
        <ShineBorder borderWidth={1} duration={16} shineColor={["#38bdf855", "#60a5fa44"]} className="opacity-70" />
        <div className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/50 p-1">
        <ShineBorder borderWidth={1} duration={18} shineColor={["#22d3ee40", "#a78bfa44"]} className="opacity-60" />
        <div className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-4">
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

