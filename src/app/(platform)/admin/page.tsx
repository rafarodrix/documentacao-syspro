import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

// Componentes
import { DashboardStats } from "@/components/platform/admin/dashboard/DashboardStats";
import { ActivityChart } from "@/components/platform/admin/dashboard/ActivityChart";
import { RecentCompanies } from "@/components/platform/admin/dashboard/RecentCompanies";

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
  const session = await getProtectedSession();
  if (!session) {
    redirect("/login");
  }

  const stats = await getDashboardStats();

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Cabeçalho da Página */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 w-fit">
          Dashboard Administrativo
        </h2>
        <p className="text-muted-foreground text-lg">
          Visão geral da saúde do sistema e métricas operacionais.
        </p>
      </div>

      {/* Seção de Estatísticas */}
      <DashboardStats
        companiesCount={stats.companiesCount}
        usersCount={stats.usersCount}
      />

      {/* Grid de Conteúdo Principal */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

        {/* Gráfico de Atividade */}
        <ActivityChart />

        {/* Lista de Empresas Recentes */}
        <RecentCompanies />

      </div>
    </div>
  );
}