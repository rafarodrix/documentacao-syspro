import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { hasPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";

// Components - Admin Dashboard
import { DashboardStats as AdminDashboardStats } from "@/components/platform/admin/dashboard/DashboardStats";
import { ActivityChart } from "@/components/platform/admin/dashboard/ActivityChart";
import { RecentCompanies } from "@/components/platform/admin/dashboard/RecentCompanies";
import { Button } from "@/components/ui/button";
import { CalendarDateRangePicker } from "@/components/DateRangePicker";
import { Download, Search, Building2 } from "lucide-react";

// Components - Client Dashboard
import { getClientDashboardData } from "@/actions/tickets/dashboard";
import { TicketSheet } from "@/components/platform/tickets/TicketSheet";
import { DashboardStats as ClientDashboardStats } from "@/components/platform/app/dashboard/DashboardStats";
import Link from "next/link";

async function getAdminDashboardStats() {
    const [companiesCount, usersCount] = await Promise.all([
        prisma.company.count(),
        prisma.user.count(),
    ]);

    const sefazData = {
        uf: "MG",
        status: "ONLINE" as const,
        latency: 45,
    };

    return {
        companiesCount,
        usersCount,
        sefazNfe: sefazData,
        sefazNfce: { ...sefazData, latency: 32 },
    };
}

export default async function DashboardPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;
    const isAdminView = hasPermission(role, "dashboard:stats_full");

    // Dashboard Administrativo (ADMIN, DEVELOPER, SUPORTE)
    if (isAdminView) {
        const stats = await getAdminDashboardStats();

        return (
            <div className="flex-1 space-y-8 p-8 pt-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h2>
                        <p className="text-muted-foreground text-lg mt-1">
                            Visao geral de performance e saude do sistema.
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="hidden md:block">
                            <CalendarDateRangePicker />
                        </div>
                        <Button className="h-9 bg-primary shadow-sm gap-2 hover:bg-primary/90 transition-all">
                            <Download className="h-4 w-4" /> Exportar Relatorio
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <AdminDashboardStats
                        companiesCount={stats.companiesCount}
                        usersCount={stats.usersCount}
                        sefazNfe={stats.sefazNfe}
                        sefazNfce={stats.sefazNfce}
                    />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-full">
                        <ActivityChart />
                        <RecentCompanies />
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard do Cliente (CLIENTE_ADMIN, CLIENTE_USER)
    const { data, error } = await getClientDashboardData();

    if (error || !data) {
        return (
            <div className="p-8 text-center text-red-500">
                Erro ao carregar dashboard. Tente recarregar.
            </div>
        );
    }

    const { user, kpis } = data;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Ola, {user.name}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-primary w-fit">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="font-medium">{user.company}</span>
                        </div>
                        <span>•</span>
                        <span className="text-xs">Painel de Controle</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/docs">
                        <Button variant="outline" className="h-10 border-primary/20 hover:bg-primary/5">
                            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                            Base de Conhecimento
                        </Button>
                    </Link>
                    <TicketSheet />
                </div>
            </div>
            <ClientDashboardStats kpis={kpis} />
        </div>
    );
}
