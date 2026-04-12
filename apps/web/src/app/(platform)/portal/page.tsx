import { requireSession } from "@/lib/auth-helpers";
import { DashboardStats } from "@/components/platform/app/dashboard/DashboardStats";
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies";
import { ActivityChart } from "@/components/platform/app/dashboard/ActivityChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MagicCard } from "@/components/magicui/MagicCard";
import { NumberTicker } from "@/components/magicui/NumberTicker";
import { ShineBorder } from "@/components/magicui/ShineBorder";
import { ArrowUpRight, BookOpen, Headset, KeyRound, PlusCircle, Sparkles, Users, Zap } from "lucide-react";
import { TicketsSummary } from "@/features/tickets/interface";
import { getDashboardData } from "@/features/dashboard/application/queries";
import { cn } from "@/lib/utils";

type SefazStatusKey = "ONLINE" | "UNSTABLE" | "OFFLINE";

export default async function DashboardPage() {
  await requireSession();
  const data = await getDashboardData();
  const dailyPassword = data.dailyPassword ?? null;

  const sefazNfeStatusMap: Record<SefazStatusKey, { label: string; color: string; dot: string }> = {
    ONLINE: {
      label: "Operacional",
      color: "text-emerald-500",
      dot: "bg-emerald-500",
    },
    UNSTABLE: {
      label: "Instavel",
      color: "text-amber-500",
      dot: "bg-amber-500",
    },
    OFFLINE: {
      label: "Indisponivel",
      color: "text-red-500",
      dot: "bg-red-500",
    },
  };
  const sefazNfeStatus = sefazNfeStatusMap[data.sefazNfe.status as SefazStatusKey];

  if (data.mode === "admin") {
    return (
      <div className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Painel operacional</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Visao operacional do sistema em tempo real.</p>
        </div>

        <div className={`grid gap-3 ${dailyPassword ? "lg:grid-cols-[minmax(0,1.7fr)_320px]" : "lg:grid-cols-1"}`}>
          <Card className={cn("border-border/50 bg-card/70", data.sefazNfe.status !== "ONLINE" && "border-amber-500/30")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className={cn("h-4 w-4", sefazNfeStatus.color)} />
                SEFAZ MG · NFe
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4 pt-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  {data.sefazNfe.status === "ONLINE" ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  ) : null}
                  <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", sefazNfeStatus.dot)} />
                </span>
                <span className={cn("text-lg font-semibold", sefazNfeStatus.color)}>{sefazNfeStatus.label}</span>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-muted-foreground">
                  {data.sefazNfe.status === "OFFLINE" || data.sefazNfe.latency <= 0 ? "Sem medicao" : `${data.sefazNfe.latency}ms`}
                </p>
                <p className="text-xs text-muted-foreground">Producao</p>
              </div>
            </CardContent>
          </Card>

          {dailyPassword ? (
            <Card className="border-border/50 bg-card/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <KeyRound className="h-4 w-4" />
                  Senha do dia
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-center font-mono text-xl font-semibold tracking-[0.18em]">
                  {dailyPassword.password}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <DashboardStats
          companiesCount={data.companiesCount}
          companiesGrowth={data.companiesGrowth}
          usersCount={data.usersCount}
          activeUsersCount={data.activeUsersCount}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-7">
          <ActivityChart
            title="Novos cadastros por dia"
            description="Empresas criadas nos ultimos 7 dias"
            points={data.activity}
            badgeLabel="Atualizado agora"
          />
          <RecentCompanies companies={data.companies} />
        </div>
      </div>
    );
  }

  const hasMultipleCompanies = data.companyCount > 1;
  const previewCompanies = data.companyNames.slice(0, 2).join(" • ");
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
              <Link href="/docs">
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
