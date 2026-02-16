"use client";

import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronRight, LogOut, Search, Settings, User, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ROLE_LABELS } from "@cadens/core/permissions";
import type { Role } from "@cadens/core/permissions";
import { cn } from "@/lib/utils";

interface PlatformHeaderProps {
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
}

export function PlatformHeader({ user }: PlatformHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const role = user.role as Role;
    const isInternalUser = ["ADMIN", "DEVELOPER", "SUPORTE"].includes(role);

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    // Breadcrumb: pega o segmento atual da URL
    const segment = pathname.split("/").filter(Boolean).pop() || "dashboard";
    const breadcrumbLabel = segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    return (
        <div className="flex items-center gap-4 w-full">
            {/* --- ESQUERDA: Breadcrumbs (Desktop) --- */}
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Link href="/" className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2 border border-primary/10">
                        {isInternalUser ? (
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                        )}
                    </div>
                    <span className="font-semibold text-foreground">
                        {isInternalUser ? "Admin" : "Portal"}
                    </span>
                </Link>
                <ChevronRight className="h-4 w-4 opacity-30" />
                <span className="bg-muted/50 px-2 py-0.5 rounded-md text-xs border border-border/50">
                    {breadcrumbLabel}
                </span>
            </div>

            {/* --- CENTRO: Barra de Busca (Desktop) --- */}
            <div className="flex-1 flex justify-center max-w-md mx-auto">
                <div className="relative w-full group hidden md:block">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <button className="flex h-9 w-full items-center rounded-lg border border-border/50 bg-muted/30 px-3 py-1 pl-9 text-sm text-muted-foreground shadow-sm transition-all hover:bg-muted/50 hover:border-primary/20 cursor-text text-left">
                        <span className="opacity-50 truncate">Buscar...</span>
                        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex shadow-sm">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </button>
                </div>
            </div>

            <div className="flex-1 md:hidden" />

            {/* --- DIREITA: Acoes e Perfil --- */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                </Button>

                <ModeToggle />

                <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 pl-0 pr-2 hover:bg-muted/50 rounded-full h-auto py-1"
                        >
                            <Avatar className="h-8 w-8 border border-border/50 ml-1">
                                <AvatarImage src={user.image || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-xs hidden sm:flex">
                                <span className="font-medium leading-none truncate max-w-[100px]">
                                    {user.name || user.email.split("@")[0]}
                                </span>
                                <span
                                    className={cn(
                                        "font-semibold text-[10px] mt-0.5",
                                        isInternalUser
                                            ? "text-purple-600 dark:text-purple-400"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {ROLE_LABELS[role] || role}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {user.name || "Usuario"}
                                </p>
                                <p className="text-xs leading-none text-muted-foreground truncate">
                                    {user.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href="/perfil" className="flex items-center w-full">
                                <User className="mr-2 h-4 w-4 text-muted-foreground" /> Perfil
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href="/configuracoes" className="flex items-center w-full">
                                <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Configuracoes
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" /> Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
