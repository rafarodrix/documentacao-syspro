import { requireSession } from "@/lib/auth-helpers";
import { DashboardStats } from "@/components/platform/app/dashboard/DashboardStats";
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies";
import { ActivityChart } from "@/components/platform/app/dashboard/ActivityChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MagicCard } from "@/components/magicui/magic-card";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { ShineBorder } from "@/components/magicui/shine-border";
import { ArrowUpRight, BookOpen, Headset, Sparkles, Users } from "lucide-react";
import { TicketsSummary } from "@/features/tickets/interface";
import { getDashboardData } from "@/features/dashboard/application/queries";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.userId, session.email, session.role);
  const isSystemUser = data.mode === "admin";

  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Bom dia, {session.name?.split(" ")[0] ?? "usuÃ¡rio"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isSystemUser ? "VisÃ£o operacional do sistema em tempo real." : "Resumo da sua conta e chamados recentes."}
        </p>
      </div>

      {data.zammadWarning && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTitle>Dados em modo contingencia</AlertTitle>
          <AlertDescription>{data.zammadWarning}</AlertDescription>
        </Alert>
      )}

      {data.mode === "admin" ? (
        <>
          <DashboardStats
            companiesCount={data.companiesCount}
            companiesGrowth={data.companiesGrowth}
            usersCount={data.usersCount}
            activeUsersCount={data.activeUsersCount}
            sefazNfe={data.sefazNfe}
            sefazNfce={data.sefazNfce}
          />

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-4">
            <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
          </div>

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">
            <ActivityChart
              title="Novos cadastros por dia"
              description="Empresas criadas nos Ãºltimos 7 dias"
              points={data.activity}
              badgeLabel="Atualizado agora"
            />
            <RecentCompanies companies={data.companies} />
          </div>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/10 p-5 sm:p-6">
            <ShineBorder borderWidth={1} duration={14} shineColor={["#60a5fa66", "#22d3ee55", "#a78bfa55"]} />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Painel do cliente
                </div>
                <h2 className="text-xl font-semibold tracking-tight">Sua operaÃ§Ã£o em um sÃ³ lugar</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acompanhe chamados, histÃ³rico e movimentaÃ§Ãµes recentes da sua conta.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/app/chamados">
                    <Headset className="h-4 w-4" />
                    Ver chamados
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/docs">
                    <BookOpen className="h-4 w-4" />
                    Abrir documentaÃ§Ã£o
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <MagicCard className="rounded-xl">
              <Card className="h-full border-border/50 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Minha empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold">{data.companyName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {data.companyName === "Sem empresa vinculada"
                      ? "Solicite vÃ­nculo de empresa ao administrador."
                      : `${data.companyUsers} usuÃ¡rio(s) vinculado(s)`}
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
                  <p className="text-xs text-muted-foreground mt-1">{data.kpis.pending} em anÃ¡lise/pendentes</p>
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
                  <p className="text-xs text-muted-foreground mt-1">HistÃ³rico dos tickets recentes</p>
                </CardContent>
              </Card>
            </MagicCard>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/50 p-1">
            <ShineBorder borderWidth={1} duration={16} shineColor={["#38bdf855", "#60a5fa44"]} className="opacity-70" />
            <div className="relative z-10 grid gap-4 grid-cols-1 xl:grid-cols-4">
              <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/50 p-1">
            <ShineBorder borderWidth={1} duration={18} shineColor={["#22d3ee40", "#a78bfa44"]} className="opacity-60" />
            <div className="relative z-10 grid gap-4 grid-cols-1 xl:grid-cols-4">
              <ActivityChart
                title="AtualizaÃ§Ãµes de chamados"
                description="Movimento dos seus chamados nos Ãºltimos 7 dias"
                points={data.activity}
                badgeLabel="Meu histÃ³rico"
                emptyLabel="Nenhuma atualizaÃ§Ã£o recente"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
              <Link href="/app/chamados">
                Ver todos os chamados
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

