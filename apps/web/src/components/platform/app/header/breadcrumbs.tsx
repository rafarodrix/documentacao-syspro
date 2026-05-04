"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard, Ticket, FileText, User, BookOpen, Rocket } from "lucide-react";
import React from "react";

// Mapa de Ã­cones e nomes amigÃ¡veis por rota
const routeConfig: Record<string, { label: string, icon: React.ElementType }> = {
    'client': { label: 'VisÃ£o Geral', icon: LayoutDashboard },
    'chamados': { label: 'Meus Tickets', icon: Ticket },
    'tickets': { label: 'Meus Tickets', icon: Ticket },
    'docs': { label: 'Documentação', icon: BookOpen },
    'releases': { label: 'Releases', icon: Rocket },
    'faturas': { label: 'Financeiro', icon: FileText },
    'perfil': { label: 'Meu Perfil', icon: User },
};

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    if (segments[0] === "portal" && segments[1] === "tickets" && segments[2]) {
        return (
            <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="flex items-center hover:text-foreground transition-colors cursor-default">
                    <span className="font-semibold text-foreground tracking-tight">Portal</span>
                </div>

                <ChevronRight className="mx-2 h-4 w-4 opacity-30" />

                <div className="flex items-center bg-muted/40 px-2.5 py-1 rounded-md border border-border/40 text-foreground/80">
                    <Ticket className="h-3.5 w-3.5 mr-2 text-primary/70" />
                    <span className="text-xs font-medium">Chamados</span>
                </div>

                <ChevronRight className="mx-2 h-4 w-4 opacity-30" />

                <div className="flex items-center bg-muted/40 px-2.5 py-1 rounded-md border border-border/40 text-foreground/80">
                    <span className="max-w-40 truncate font-mono text-xs font-medium">{segments[2]}</span>
                </div>
            </div>
        );
    }

    // Pega o Ãºltimo segmento da URL (ex: /client/chamados -> chamados)
    const segment = segments.at(-1) || "client";
    const config = routeConfig[segment] || { label: segment, icon: LayoutDashboard };
    const Icon = config.icon;

    // Formata o nome se nÃ£o estiver no config
    const label = config.label === segment
        ? segment.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())
        : config.label;

    return (
        <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-500">
            <div className="flex items-center hover:text-foreground transition-colors cursor-default">
                <span className="font-semibold text-foreground tracking-tight">Portal</span>
            </div>

            <ChevronRight className="mx-2 h-4 w-4 opacity-30" />

            <div className="flex items-center bg-muted/40 px-2.5 py-1 rounded-md border border-border/40 text-foreground/80">
                <Icon className="h-3.5 w-3.5 mr-2 text-primary/70" />
                <span className="text-xs font-medium">{label}</span>
            </div>
        </div>
    );
}
