"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    FileText,
    ShieldCheck,
    LogOut,
    Headset,
    BookOpen,
    GraduationCap,
    HelpCircle,
    ChevronUp,
    Sparkles,
    Wrench,
    Scale
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- TIPOS ---
type NavItem = {
    title: string;
    href: string;
    icon: React.ElementType;
    roles?: string[];
};

// --- MENU CONFIG ---
const manageNav: NavItem[] = [
    { title: "Dashboard", href: "/app", icon: LayoutDashboard },
    { title: "Gestão de Equipe", href: "/app/cadastros", icon: Users },
    { title: "Contratos", href: "/app/contratos", icon: FileText },
];

const systemNav: NavItem[] = [
    { title: "Central de Chamados", href: "/admin/chamados", icon: Headset },
    { title: "Ferramentas", href: "/app/tools", icon: Wrench },
    { title: "Reforma Tributária", href: "/app/reforma-tributaria", icon: Scale },
];

const helpNav: NavItem[] = [
    { title: "Documentação", href: "/docs/manual", icon: BookOpen },
    { title: "Dúvidas", href: "/docs/duvidas", icon: GraduationCap },
    { title: "Releases", href: "/releases", icon: Sparkles },
];

interface AdminSidebarProps {
    mobile?: boolean;
    onClose?: () => void; // Callback para fechar o menu mobile ao clicar
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
}

// --- COMPONENTE PRINCIPAL ---
export function AdminSidebar({ mobile = false, onClose, user }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    const filterNav = (items: NavItem[]) => {
        return items.filter(item => !item.roles || item.roles.includes(user.role));
    };

    return (
        <div className={cn(
            "flex flex-col bg-background border-r border-border/40",
            mobile ? "h-full w-full" : "h-screen w-72 fixed left-0 top-0 hidden md:flex"
        )}>

            {/* --- HEADER --- */}
            <div className="flex h-16 items-center px-6 border-b border-border/40 bg-muted/5 shrink-0">
                <Link href="/admin" className="flex items-center gap-2.5 font-semibold group w-full" onClick={onClose}>
                    <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm group-hover:bg-purple-700 transition-colors">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="tracking-tight text-sm font-bold text-foreground">Trilink<span className="text-purple-600 dark:text-purple-400">Admin</span></span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Painel de Controle</span>
                    </div>
                </Link>
            </div>

            {/* --- NAVEGAÇÃO (SCROLLÁVEL) --- */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

                {/* Grupo 1: Gestão */}
                <NavGroup title="Gerenciamento">
                    {filterNav(manageNav).map((item) => (
                        <SidebarItem key={item.href} item={item} pathname={pathname} onClick={onClose} />
                    ))}
                </NavGroup>

                <Separator className="bg-border/40" />

                {/* Grupo 2: Sistema */}
                <NavGroup title="Sistema">
                    {filterNav(systemNav).map((item) => (
                        <SidebarItem key={item.href} item={item} pathname={pathname} onClick={onClose} />
                    ))}
                </NavGroup>

                <Separator className="bg-border/40" />

                {/* Grupo 3: Recursos */}
                <NavGroup title="Recursos">
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
                                <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs font-bold">
                                    {user.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground truncate w-full group-hover:text-purple-600 transition-colors">
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
                                    {user.role.toLowerCase().replace('_', ' ')}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { router.push('/admin/configuracoes'); onClose?.(); }}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configurações
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { /* Link suporte */ onClose?.(); }}>
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Suporte
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair do Sistema
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
            <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                {title}
            </p>
            {children}
        </nav>
    )
}

function SidebarItem({ item, pathname, onClick }: { item: NavItem, pathname: string, onClick?: () => void }) {
    const isActive = item.href === "/admin"
        ? pathname === "/admin"
        : pathname.startsWith(item.href);

    return (
        <Link href={item.href} onClick={onClick}>
            <span className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-500/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}>
                <div className="flex items-center gap-3">
                    <item.icon className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground group-hover:text-foreground opacity-70 group-hover:opacity-100"
                    )} />
                    {item.title}
                </div>

                {isActive && (
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(147,51,234,0.5)]" />
                )}
            </span>
        </Link>
    );
}