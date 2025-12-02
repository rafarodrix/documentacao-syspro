"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
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
    Wrench,
    LogOut,
    ChevronUp,
    Settings
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// --- TIPOS ---
type NavItem = {
    title: string;
    href: string;
    icon: React.ElementType;
    roles?: string[];
};

// --- MENU CONFIG ---
const mainNav: NavItem[] = [
    { title: "Visão Geral", href: "/app", icon: LayoutDashboard },
    { title: "Meus Chamados", href: "/app/chamados", icon: Ticket },
    // Apenas CLIENTE_ADMIN vê Gestão de Equipe e Ferramentas
    { title: "Gestão de Equipe", href: "/app/cadastros", icon: Users, roles: ['CLIENTE_ADMIN'] },
    { title: "Ferramentas", href: "/app/tools", icon: Wrench, roles: ['CLIENTE_ADMIN'] }
];

const helpNav: NavItem[] = [
    { title: "Documentação", href: "/docs/manual", icon: BookOpen },
    { title: "Dúvidas", href: "/docs/duvidas", icon: GraduationCap },
    { title: "Suporte Técnico", href: "/docs/suporte", icon: Headset },
    { title: "Releases", href: "/releases", icon: Rocket },
];

interface ClientSidebarProps {
    mobile?: boolean;
    onClose?: () => void; // Importante para fechar o menu mobile ao clicar
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
}

export function ClientSidebar({ mobile = false, onClose, user }: ClientSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    // Filtra itens baseado na role
    const filterNav = (items: NavItem[]) => {
        return items.filter(item => !item.roles || item.roles.includes(user.role));
    };

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <div className={cn(
            "flex flex-col bg-background border-r border-border/40",
            mobile ? "h-full w-full" : "h-screen w-72 fixed left-0 top-0 hidden md:flex"
        )}>

            {/* --- HEADER --- */}
            <div className="flex h-16 items-center px-6 border-b border-border/40 bg-muted/5 shrink-0">
                <Link href="/app" className="flex items-center gap-2.5 font-semibold group w-full" onClick={onClose}>
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

            {/* --- NAVEGAÇÃO --- */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">

                {/* Grupo 1: Operacional */}
                <NavGroup title="Operacional">
                    {filterNav(mainNav).map((item) => (
                        <SidebarItem key={item.href} item={item} pathname={pathname} onClick={onClose} />
                    ))}
                </NavGroup>

                <Separator className="bg-border/40 mx-2 w-auto" />

                {/* Grupo 2: Ajuda */}
                <NavGroup title="Central de Ajuda">
                    {filterNav(helpNav).map((item) => (
                        <SidebarItem key={item.href} item={item} pathname={pathname} onClick={onClose} />
                    ))}
                </NavGroup>

            </div>

            {/* --- RODAPÉ: PERFIL --- */}
            <div className="p-3 border-t border-border/40 bg-muted/5 shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors outline-none group text-left">
                            <Avatar className="h-9 w-9 border border-border/50">
                                <AvatarImage src={user.image || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                    {user.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start flex-1 min-w-0">
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
                                <p className="text-xs leading-none text-muted-foreground capitalize">
                                    {user.role === 'CLIENTE_ADMIN' ? 'Gestor' : 'Colaborador'}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { router.push('/app/perfil'); onClose?.(); }}>
                            <Settings className="mr-2 h-4 w-4" />
                            Meus Dados
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { router.push('/docs/suporte'); onClose?.(); }}>
                            <Headset className="mr-2 h-4 w-4" />
                            Suporte
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

// --- SUBCOMPONENTES ---

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <nav className="grid gap-1">
            <p className="px-3 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2 font-mono">
                {title}
            </p>
            {children}
        </nav>
    )
}

function SidebarItem({ item, pathname, onClick }: { item: NavItem, pathname: string, onClick?: () => void }) {
    const isActive = item.href === "/app"
        ? pathname === "/app"
        : pathname.startsWith(item.href);

    return (
        <Link href={item.href} onClick={onClick}>
            <span className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}>
                <item.icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground opacity-70 group-hover:opacity-100"
                )} />
                {item.title}

                {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
            </span>
        </Link>
    );
}