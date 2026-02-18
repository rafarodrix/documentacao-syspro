"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ShieldCheck,
    Sparkles,
    ChevronUp,
    Settings,
    Headset,
    LogOut,
    HelpCircle,
} from "lucide-react";
import { ROLE_LABELS } from "@cadens/core/permissions";
import type { Role } from "@cadens/core/permissions";
import type { NavGroup } from "./navigation";

interface PlatformSidebarProps {
    mobile?: boolean;
    onClose?: () => void;
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
    navigation: NavGroup[];
}

// Cores do tema por tipo de role
const ROLE_THEME = {
    ADMIN: { accent: "purple", icon: ShieldCheck, label: "Admin" },
    DEVELOPER: { accent: "indigo", icon: ShieldCheck, label: "Dev" },
    SUPORTE: { accent: "orange", icon: ShieldCheck, label: "Suporte" },
    CLIENTE_ADMIN: { accent: "primary", icon: Sparkles, label: "Portal" },
    CLIENTE_USER: { accent: "primary", icon: Sparkles, label: "Portal" },
} as const;

export function PlatformSidebar({ mobile = false, onClose, user, navigation }: PlatformSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const role = user.role as Role;

    const theme = ROLE_THEME[role] || ROLE_THEME.CLIENTE_USER;
    const isInternalUser = ["ADMIN", "DEVELOPER", "SUPORTE"].includes(role);
    const ThemeIcon = theme.icon;

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <div
            className={cn(
                "flex flex-col bg-background border-r border-border/40",
                mobile ? "h-full w-full" : "h-screen w-72 fixed left-0 top-0 hidden md:flex"
            )}
        >
            {/* --- HEADER --- */}
            <div className="flex h-16 items-center px-6 border-b border-border/40 bg-muted/5 shrink-0">
                <Link href="/" className="flex items-center gap-2.5 font-semibold group w-full" onClick={onClose}>
                    <div
                        className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-300",
                            isInternalUser
                                ? "bg-purple-600 group-hover:bg-purple-700"
                                : "bg-gradient-to-br from-primary to-primary/80"
                        )}
                    >
                        <ThemeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="tracking-tight text-sm font-bold text-foreground">
                            {isInternalUser ? (
                                <>Trilink<span className="text-purple-600 dark:text-purple-400">Admin</span></>
                            ) : (
                                "Trilink"
                            )}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            {isInternalUser ? "Painel de Controle" : "Portal do Cliente"}
                        </span>
                    </div>
                </Link>
            </div>

            {/* --- NAVEGACAO (SCROLLAVEL) --- */}
            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
                {navigation.map((group, groupIndex) => (
                    <div key={group.title}>
                        {groupIndex > 0 && <Separator className="bg-border/40 mb-6" />}
                        <nav className="grid gap-1">
                            <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                                {group.title}
                            </p>
                            {group.items.map((item) => {
                                const isActive =
                                    item.href === "/"
                                        ? pathname === "/"
                                        : pathname.startsWith(item.href);

                                return (
                                    <Link key={item.href} href={item.href} onClick={onClose}>
                                        <span
                                            className={cn(
                                                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? isInternalUser
                                                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-500/20"
                                                        : "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                                                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon
                                                    className={cn(
                                                        "h-4 w-4 transition-colors",
                                                        isActive
                                                            ? isInternalUser
                                                                ? "text-purple-600 dark:text-purple-400"
                                                                : "text-primary"
                                                            : "text-muted-foreground group-hover:text-foreground opacity-70 group-hover:opacity-100"
                                                    )}
                                                />
                                                {item.title}
                                            </div>

                                            {isActive && (
                                                <div
                                                    className={cn(
                                                        "h-1.5 w-1.5 rounded-full animate-pulse",
                                                        isInternalUser
                                                            ? "bg-purple-600 dark:bg-purple-400 shadow-[0_0_8px_rgba(147,51,234,0.5)]"
                                                            : "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                                                    )}
                                                />
                                            )}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>

            {/* --- RODAPE: PERFIL --- */}
            <div className="p-3 border-t border-border/40 bg-muted/5 shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors outline-none group text-left">
                            <Avatar className="h-9 w-9 border border-border/50">
                                <AvatarImage src={user.image || ""} />
                                <AvatarFallback
                                    className={cn(
                                        "text-xs font-bold",
                                        isInternalUser
                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                            : "bg-primary/10 text-primary"
                                    )}
                                >
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
                                <p className="text-xs leading-none text-muted-foreground">
                                    {ROLE_LABELS[role] || role}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                                router.push("/perfil");
                                onClose?.();
                            }}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Meus Dados
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                                router.push("/chamados");
                                onClose?.();
                            }}
                        >
                            <Headset className="mr-2 h-4 w-4" />
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
