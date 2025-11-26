"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
    LayoutDashboard,
    BookOpen,
    LogOut,
    HelpCircle,
    GraduationCap,
    Headset,
    Terminal,
    Ticket, // Descomente se for usar a página de chamados listada
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Grupo 1: Navegação Principal
const mainNav = [
    { title: "Visão Geral", href: "/client", icon: LayoutDashboard },
    // { title: "Meus Chamados", href: "/client/chamados", icon: Ticket },
];

// Grupo 2: Recursos de Ajuda
const helpNav = [
    { title: "Documentação", href: "/docs/manual", icon: BookOpen },
    { title: "Treinamentos", href: "/docs/treinamento", icon: GraduationCap },
    { title: "Dúvidas Frequentes", href: "/docs/duvidas", icon: HelpCircle },
    { title: "Suporte Técnico", href: "/docs/suporte", icon: Headset },
];

interface ClientSidebarProps {
    mobile?: boolean;
}

export function ClientSidebar({ mobile = false }: ClientSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <div className={cn(
            "flex h-full flex-col bg-background",
            !mobile && "h-screen" // Altura total apenas no desktop
        )}>

            {/* --- CABEÇALHO (Branding Client) --- */}
            <div className={cn("flex h-16 items-center px-6 border-b border-border/40", mobile && "px-4")}>
                <Link href="/client" className="flex items-center gap-2 font-semibold group">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10 transition-colors group-hover:bg-primary/20">
                        <Terminal className="h-5 w-5" />
                    </div>
                    <span className="tracking-tight text-lg">Trilink<span className="text-primary font-bold">Client</span></span>
                </Link>
            </div>

            {/* --- CONTEÚDO DE NAVEGAÇÃO --- */}
            <div className="flex-1 overflow-y-auto py-6 px-3">

                {/* Seção Principal */}
                <nav className="grid gap-1 mb-6">
                    <p className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                        Principal
                    </p>
                    {mainNav.map((item) => (
                        <NavItem key={item.href} item={item} pathname={pathname} />
                    ))}
                </nav>

                <Separator className="my-4 bg-border/40" />

                {/* Seção de Recursos */}
                <nav className="grid gap-1">
                    <p className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
                        Recursos & Ajuda
                    </p>
                    {helpNav.map((item) => (
                        <NavItem key={item.href} item={item} pathname={pathname} />
                    ))}
                </nav>

            </div>

            {/* --- RODAPÉ / LOGOUT --- */}
            <div className="p-4 border-t border-border/40">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Sair da Conta</span>
                </Button>
            </div>
        </div>
    );
}

/* --- Componente de Item de Menu (Estilo Magic UI) --- */
function NavItem({ item, pathname }: { item: any, pathname: string }) {
    // Verifica correspondência exata ou sub-rotas (exceto a home para não ficar sempre ativa)
    const isActive = item.href === "/client"
        ? pathname === "/client"
        : pathname.startsWith(item.href);

    return (
        <Link href={item.href}>
            <span className={cn(
                "group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
                <div className="flex items-center gap-3">
                    <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.title}
                </div>
                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
            </span>
        </Link>
    );
}