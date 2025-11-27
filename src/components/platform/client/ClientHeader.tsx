"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { ClientSidebar } from "./ClientSidebar"; // Import da Sidebar para o menu mobile

// Ícones
import {
    Bell, Menu, Search, Settings, LogOut, User, ChevronRight,
    Command, LayoutDashboard, HelpCircle
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientHeaderProps {
    // Agora aceita o objeto completo para repassar à sidebar e usar no avatar
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
}

export function ClientHeader({ user }: ClientHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    // Gera o breadcrumb baseado na rota atual (Ex: /client/chamados -> Chamados)
    const pageName = pathname === "/client"
        ? "Visão Geral"
        : pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 px-6 backdrop-blur-xl transition-all">

            {/* --- ESQUERDA: Menu Mobile & Contexto --- */}
            <div className="flex items-center gap-4">

                {/* Menu Hamburger (Mobile Only) */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-muted-foreground hover:bg-muted/50">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-r-border/50">
                        {/* AQUI ESTAVA O ERRO: Agora passamos o objeto user completo */}
                        <ClientSidebar mobile user={user} />
                    </SheetContent>
                </Sheet>

                {/* Breadcrumbs (Desktop) */}
                <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground">
                    <div className="flex items-center hover:text-foreground transition-colors cursor-default">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center mr-2.5">
                            <LayoutDashboard className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground tracking-tight">Portal do Cliente</span>
                    </div>

                    <ChevronRight className="mx-2 h-4 w-4 opacity-30" />

                    <span className="bg-muted/50 px-2.5 py-1 rounded-md text-xs font-medium border border-border/50 text-foreground/80">
                        {pageName}
                    </span>
                </div>
            </div>

            {/* --- CENTRO: Command Palette (Visual) --- */}
            <div className="flex-1 flex justify-center max-w-xl mx-auto hidden md:flex">
                <button className="relative w-full group flex items-center">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="flex h-9 w-full items-center rounded-lg border border-border/50 bg-muted/40 px-3 pl-10 text-sm text-muted-foreground shadow-sm transition-all hover:bg-background hover:border-border hover:shadow-md cursor-pointer">
                        <span className="opacity-60 mr-auto">Pesquisar chamados, faturas ou documentos...</span>
                        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </button>
            </div>

            <div className="flex-1 md:hidden" />

            {/* --- DIREITA: Ações & Perfil --- */}
            <div className="flex items-center gap-2 md:gap-3">

                {/* Notificações */}
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full h-9 w-9">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                </Button>

                <ModeToggle />

                <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-border/50 bg-background hover:bg-muted transition-all p-0 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-ring">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={user.image || ""} alt={user.name} />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                    {user.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem className="cursor-pointer group">
                            <User className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span>Meu Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer group">
                            <Settings className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span>Preferências</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer group">
                            <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span>Ajuda</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}