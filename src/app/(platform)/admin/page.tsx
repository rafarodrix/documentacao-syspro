import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { Download } from "lucide-react";

// Componentes
import { DashboardStats } from "@/components/platform/admin/dashboard/DashboardStats";
import { ActivityChart } from "@/components/platform/admin/dashboard/ActivityChart";
import { RecentCompanies } from "@/components/platform/admin/dashboard/RecentCompanies";

async function getDashboardStats() {
  const [companiesCount, usersCount] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
  ]);

  return { companiesCount, usersCount };
}

export default async function AdminDashboardPage() {
  const session = await getProtectedSession();
  if (!session) redirect("/login");

  const stats = await getDashboardStats();

  return (
    // Layout Fluido (Enterprise Standard): Ocupa toda a largura e altura disponível
    <div className="flex-1 space-y-8 p-8 pt-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Fundo Decorativo (Grid Pattern) - Magic UI Touch */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Cabeçalho Enterprise */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground text-lg mt-1">
            Visão geral de performance e saúde do sistema.
          </p>
        </div>

        {/* Área de Ações do Dashboard */}
        <div className="flex items-center space-x-3">
          {/* Seletor de Data Funcional */}
          <div className="hidden md:block">
            <CalendarDateRangePicker />
          </div>

          {/* Botão de Exportação */}
          <Button className="h-9 bg-primary shadow-sm gap-2 hover:bg-primary/90 transition-all">
            <Download className="h-4 w-4" /> Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="space-y-4">

        {/* Seção 1: KPIs */}
        <DashboardStats
          companiesCount={stats.companiesCount}
          usersCount={stats.usersCount}
        />

        {/* Seção 2: Gráficos e Listas (Grid Assimétrico) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
          <ActivityChart />
          <RecentCompanies />
        </div>

      </div>
    </div>
  );
}