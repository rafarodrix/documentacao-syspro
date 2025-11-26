"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    FileText,
    ShieldCheck,
    LogOut,
    Activity
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Grupo 1: Operacional
const manageNav = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Empresas", href: "/admin/empresas", icon: Building2 },
    { title: "Usuários", href: "/admin/usuarios", icon: Users },
];

// Grupo 2: Sistema
const systemNav = [
    { title: "Logs do Sistema", href: "/admin/logs", icon: FileText },
    { title: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

interface AdminSidebarProps {
    mobile?: boolean;
}

export function AdminSidebar({ mobile = false }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <div className={cn(
            "flex h-full flex-col bg-background",
            !mobile && "h-screen"
        )}>

            {/* --- CABEÇALHO (Branding Admin) --- */}
            <div className={cn("flex h-16 items-center px-6 border-b border-border/40", mobile && "px-4")}>
                <Link href="/admin" className="flex items-center gap-2 font-semibold group">
                    {/* Ícone com tom Roxo para diferenciar do Client */}
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-500/10 transition-colors group-hover:bg-purple-500/20">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <span className="tracking-tight text-lg">Trilink<span className="text-purple-600 dark:text-purple-400 font-bold">Admin</span></span>
                </Link>
            </div>

            {/* --- NAVEGAÇÃO --- */}
            <div className="flex-1 overflow-y-auto py-6 px-3">

                {/* Gerenciamento */}
                <nav className="grid gap-1 mb-6">
                    <p className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                        Gerenciamento
                    </p>
                    {manageNav.map((item) => (
                        <NavItem key={item.href} item={item} pathname={pathname} />
                    ))}
                </nav>

                <Separator className="my-4 bg-border/40" />

                {/* Sistema */}
                <nav className="grid gap-1">
                    <p className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                        Sistema
                    </p>
                    {systemNav.map((item) => (
                        <NavItem key={item.href} item={item} pathname={pathname} />
                    ))}
                </nav>

            </div>

            {/* --- RODAPÉ --- */}
            <div className="p-4 border-t border-border/40">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Sair do Sistema</span>
                </Button>
            </div>
        </div>
    );
}

/* --- Componente de Item de Menu --- */
function NavItem({ item, pathname }: { item: any, pathname: string }) {
    // Verifica se a rota atual começa com o href do item (para sub-rotas)
    // Exceção para a home do admin (/admin) para não ficar sempre ativa
    const isActive = item.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(item.href);

    return (
        <Link href={item.href}>
            <span className={cn(
                "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
                <div className="flex items-center gap-3">
                    <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.title}
                </div>
                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />}
            </span>
        </Link>
    );
}