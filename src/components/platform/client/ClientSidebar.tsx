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
    Ticket,
    Settings,
    Users,
    ChevronUp,
    Sparkles
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Definição dos Tipos de Menu com Permissões
type NavItem = {
    title: string;
    href: string;
    icon: React.ElementType;
    roles?: string[]; // Se indefinido, visível para todos
    badge?: string;   // Opcional: Badge de novidade ou contagem
};

// --- CONFIGURAÇÃO DO MENU ---
const mainNav: NavItem[] = [
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
    // Exemplo de item restrito ao Gestor do Cliente
    {
        title: "Gestão de Equipe",
        href: "/client/equipe",
        icon: Users,
        roles: ["CLIENT_ADMIN"]
    },
];

const helpNav: NavItem[] = [
    { title: "Documentação", href: "/docs/manual", icon: BookOpen },
    { title: "Treinamentos", href: "/docs/treinamento", icon: GraduationCap },
    { title: "Suporte Técnico", href: "/docs/suporte", icon: Headset },
];

interface ClientSidebarProps {
    mobile?: boolean;
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    }; // Recebe o usuário para validar permissões
}

export function ClientSidebar({ mobile = false, user }: ClientSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    // Filtra itens baseado na role do usuário
    const filterNav = (items: NavItem[]) => {
        return items.filter(item =>
            !item.roles || item.roles.includes(user.role)
        );
    };

    return (
        <div className={cn(
            "flex h-full flex-col bg-background border-r border-border/40",
            !mobile && "h-screen"
        )}>

            {/* --- CABEÇALHO (Branding) --- */}
            <div className="flex h-16 items-center px-6 border-b border-border/40 bg-muted/5">
                <Link href="/client" className="flex items-center gap-2.5 font-semibold group w-full">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="tracking-tight text-sm font-bold text-foreground">Trilink</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Portal do Cliente</span>
                    </div>
                </Link>
            </div>

            {/* --- NAVEGAÇÃO SCROLLÁVEL --- */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

                {/* Grupo Principal */}
                <nav className="grid gap-1">
                    <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                        Operacional
                    </p>
                    {filterNav(mainNav).map((item) => (
                        <SidebarItem key={item.href} item={item} pathname={pathname} />
                    ))}
                </nav>

                <Separator className="bg-border/40" />

                {/* Grupo Ajuda */}
                <nav className="grid gap-1">
                    <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                        Central de Ajuda
                    </p>
                    {filterNav(helpNav).map((item) => (
                        <SidebarItem key={item.href} item={item} pathname={pathname} />
                    ))}
                </nav>
            </div>

            {/* --- RODAPÉ: USER PROFILE (Estilo Enterprise) --- */}
            <div className="p-3 border-t border-border/40 bg-muted/5">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors outline-none group">
                            <Avatar className="h-9 w-9 border border-border/50">
                                <AvatarImage src={user.image || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                    {user.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground truncate w-full group-hover:text-primary transition-colors">
                                    {user.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate w-full">
                                    {user.email}
                                </span>
                            </div>
                            <ChevronUp className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="start" className="w-[240px] mb-2" side="top">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Minha Conta</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.role === 'CLIENT_ADMIN' ? 'Gestor da Conta' : 'Usuário'}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Configurações
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Suporte
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair da plataforma
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTE DE ITEM ---
function SidebarItem({ item, pathname }: { item: NavItem, pathname: string }) {
    const isActive = item.href === "/client"
        ? pathname === "/client"
        : pathname.startsWith(item.href);

    return (
        <Link href={item.href}>
            <span className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}>
                <div className="flex items-center gap-3">
                    <item.icon className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground opacity-70 group-hover:opacity-100"
                    )} />
                    {item.title}
                </div>

                {/* Badge ou Indicador Ativo */}
                {item.badge ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 bg-background border-border/60">
                        {item.badge}
                    </Badge>
                ) : isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
            </span>
        </Link>
    );
}