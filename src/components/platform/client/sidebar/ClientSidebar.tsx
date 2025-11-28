"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
    LayoutDashboard,
    BookOpen,
    GraduationCap,
    Headset,
    Ticket,
    Users,
    Sparkles,
    Rocket,
    Wrench
} from "lucide-react";

// Imports dos Sub-componentes
import { NavItem, type NavItemType } from "./nav-item";
import { UserProfile } from "./user-profile";

// --- CONFIGURAÇÃO DO MENU ---
const mainNav: NavItemType[] = [
    {
        title: "Visão Geral",
        href: "/client",
        icon: LayoutDashboard
    },
    {
        title: "Meus Chamados",
        href: "/client/chamados",
        icon: Ticket,
        badge: "Novo"
    },
    {
        title: "Gestão de Equipe",
        href: "/client/equipe",
        icon: Users,
        roles: ["CLIENT_ADMIN"]
    },
];

const helpNav: NavItemType[] = [
    { title: "Documentação", href: "/docs/manual", icon: BookOpen },
    { title: "Treinamentos", href: "/docs/treinamento", icon: GraduationCap },
    { title: "Suporte Técnico", href: "/docs/suporte", icon: Headset },
    { title: "Releases", href: "/releases", icon: Rocket },
    { title: "Ferramentas", href: "/client/tools", icon: Wrench },
];

interface ClientSidebarProps {
    mobile?: boolean;
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
}

export function ClientSidebar({ mobile = false, user }: ClientSidebarProps) {
    const pathname = usePathname();

    // Filtra itens baseado na role do usuário
    const filterNav = (items: NavItemType[]) => {
        return items.filter(item =>
            !item.roles || item.roles.includes(user.role)
        );
    };

    return (
        <div className={cn(
            "flex h-full flex-col bg-background/95 backdrop-blur-xl border-r border-border/40",
            !mobile && "h-screen"
        )}>

            {/* --- CABEÇALHO (Branding) --- */}
            <div className="flex h-16 items-center px-6 border-b border-border/40 bg-muted/5">
                <Link href="/client" className="flex items-center gap-2.5 font-semibold group w-full">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="tracking-tight text-sm font-bold text-foreground">Trilink</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium group-hover:text-primary transition-colors">
                            Portal do Cliente
                        </span>
                    </div>
                </Link>
            </div>

            {/* --- NAVEGAÇÃO SCROLLÁVEL --- */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">

                {/* Grupo Principal */}
                <nav className="grid gap-1">
                    <p className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 font-mono">
                        Operacional
                    </p>
                    {filterNav(mainNav).map((item) => {
                        const isActive = item.href === "/client"
                            ? pathname === "/client"
                            : pathname.startsWith(item.href);

                        return <NavItem key={item.href} item={item} isActive={isActive} />;
                    })}
                </nav>

                <Separator className="bg-border/40 mx-2 w-auto" />

                {/* Grupo Ajuda */}
                <nav className="grid gap-1">
                    <p className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 font-mono">
                        Central de Ajuda
                    </p>
                    {filterNav(helpNav).map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return <NavItem key={item.href} item={item} isActive={isActive} />;
                    })}
                </nav>
            </div>

            {/* --- RODAPÉ: USER PROFILE --- */}
            <UserProfile user={user} />
        </div>
    );
}