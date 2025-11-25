import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Users, Activity, ServerCrash, TrendingUp, ArrowUpRight } from "lucide-react";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-8">

      {/* Cabeçalho da Página */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Dashboard Administrativo
          </h2>
          <p className="text-muted-foreground">
            Visão geral do sistema e métricas de performance.
          </p>
        </div>
      </div>

      {/* Cards de Métricas (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        {/* KPI: Empresas */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-blue-500/5 hover:shadow-md hover:border-blue-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empresas Ativas
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.companiesCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">+2</span>&nbsp;este mês
            </p>
          </CardContent>
        </Card>

        {/* KPI: Usuários */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-purple-500/5 hover:shadow-md hover:border-purple-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Totais
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-500" />
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
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center animate-pulse">
              <Activity className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Operacional</div>
            <p className="text-xs text-emerald-600/80 mt-1">
              Latência média: 24ms
            </p>
          </CardContent>
        </Card>

        {/* KPI: Erros */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-red-500/5 hover:shadow-md hover:border-red-500/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Erros Recentes
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ServerCrash className="h-4 w-4 text-red-500" />
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

      {/* Grid de Conteúdo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* Gráfico / Atividade */}
        <Card className="col-span-4 border-border/50 shadow-sm hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Tráfego e ações no sistema nos últimos 7 dias.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground text-sm border border-dashed border-border/50 rounded-xl m-4 bg-muted/10">
              <Activity className="h-8 w-8 mb-2 opacity-20" />
              <span>[Gráfico de Acessos ou Logs viria aqui]</span>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Empresas Recentes */}
        <Card className="col-span-3 border-border/50 shadow-sm hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle>Últimas Empresas</CardTitle>
            <CardDescription>Cadastros recentes na plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Empty State melhorado */}
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4 max-w-[200px]">
                  Gerencie as empresas cadastradas para ver detalhes.
                </p>
                <Link href="/admin/companies" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                  Acessar menu Empresas <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}