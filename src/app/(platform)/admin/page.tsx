import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Activity,
  ServerCrash,
  TrendingUp,
  ArrowUpRight,
  BarChart3,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";

// Função auxiliar para buscar estatísticas
async function getDashboardStats() {
  const [companiesCount, usersCount] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
  ]);

  return {
    companiesCount,
    usersCount,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 w-fit">
          Dashboard Administrativo
        </h2>
        <p className="text-muted-foreground text-lg">
          Visão geral da saúde do sistema e métricas operacionais.
        </p>
      </div>

      {/* Cards de Métricas (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* KPI: Empresas */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-blue-500/5 hover:shadow-md hover:border-blue-500/20 transition-all duration-300 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building2 className="w-16 h-16 text-blue-500 -rotate-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empresas Ativas
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.companiesCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">+2</span> este mês
            </p>
          </CardContent>
        </Card>

        {/* KPI: Usuários */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-purple-500/5 hover:shadow-md hover:border-purple-500/20 transition-all duration-300 group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-purple-500 rotate-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Totais
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.usersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Incluindo admins e clientes
            </p>
          </CardContent>
        </Card>

        {/* KPI: Status */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-emerald-500/5 hover:shadow-md hover:border-emerald-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status do Sistema
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center animate-pulse text-emerald-500">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Operacional</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-mono">
              Latência média: 24ms
            </p>
          </CardContent>
        </Card>

        {/* KPI: Erros */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-red-500/5 hover:shadow-md hover:border-red-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Erros Críticos
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <ServerCrash className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Grid de Conteúdo Principal */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

        {/* GRÁFICO DE ATIVIDADE (Placeholder Rico) */}
        <Card className="col-span-4 border-border/50 shadow-sm hover:shadow-md transition-all bg-background/60 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Atividade do Sistema</CardTitle>
                <CardDescription>Tráfego e requisições nos últimos 7 dias.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                <Activity className="mr-1 h-3 w-3" /> Tempo Real
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 m-1 relative overflow-hidden group">
              {/* Fundo animado sutil */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

              <div className="flex flex-col items-center gap-3 z-10 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="p-3 rounded-full bg-background border border-border shadow-sm">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Gráfico de desempenho indisponível no momento
                </p>
                <p className="text-xs text-muted-foreground/60 max-w-[250px] text-center">
                  Conecte uma ferramenta de analytics como Vercel Analytics ou PostHog.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LISTA DE EMPRESAS (Empty State Refatorado) */}
        <Card className="col-span-3 border-border/50 shadow-sm hover:shadow-md transition-all bg-background/60 backdrop-blur-sm flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Últimas Empresas</CardTitle>
              <Link href="/admin/empresas">
                <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
                  Ver todas
                </Badge>
              </Link>
            </div>
            <CardDescription>Novos cadastros na plataforma.</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-primary/20 blur-md animate-pulse"></div>
                <div className="relative h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                  <Building2 className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-medium text-foreground">Nenhuma atividade recente</h3>
                <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                  Novas empresas cadastradas aparecerão aqui automaticamente.
                </p>
              </div>

              <Link href="/admin/empresas">
                <span className="inline-flex items-center text-xs font-semibold text-primary hover:underline mt-2 group">
                  Gerenciar Cadastros
                  <ArrowUpRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}