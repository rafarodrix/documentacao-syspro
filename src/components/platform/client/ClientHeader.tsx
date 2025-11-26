"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Bell, Menu, Search, Settings, LogOut, User, ChevronRight, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientSidebar } from "./ClientSidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface ClientHeaderProps {
    userEmail: string;
}

export function ClientHeader({ userEmail }: ClientHeaderProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/60 px-6 backdrop-blur-xl transition-all supports-[backdrop-filter]:bg-background/60">

            {/* --- ESQUERDA: Menu Mobile & Breadcrumbs --- */}
            <div className="flex items-center gap-4">
                {/* Menu Mobile */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-muted-foreground">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-r-border/50">
                        <ClientSidebar mobile />
                    </SheetContent>
                </Sheet>

                {/* Breadcrumbs / Contexto (Desktop) */}
                <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground">
                    <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2">
                            <Command className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">Portal</span>
                    </div>
                    <ChevronRight className="mx-2 h-4 w-4 opacity-30" />
                    <span className="bg-muted/50 px-2 py-0.5 rounded-md text-xs border border-border/50">Dashboard</span>
                </div>
            </div>

            {/* --- CENTRO: Barra de Busca (Command Palette Placeholder) --- */}
            {/* Estilo 'Magic UI': Input falso que parece clicável */}
            <div className="flex-1 flex justify-center max-w-md mx-auto hidden md:flex">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <button className="flex h-9 w-full items-center rounded-lg border border-border/50 bg-muted/30 px-3 py-1 pl-9 text-sm text-muted-foreground shadow-sm transition-all hover:bg-muted/50 hover:border-primary/20 cursor-text text-left">
                        <span className="opacity-50 truncate">Pesquisar chamados, docs...</span>
                        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex shadow-sm">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </button>
                </div>
            </div>

            <div className="flex-1 md:hidden" /> {/* Espaçador para Mobile */}

            {/* --- DIREITA: Ações & Perfil --- */}
            <div className="flex items-center gap-2 md:gap-3">

                {/* Notificações */}
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <Bell className="h-5 w-5" />
                    {/* Badge de notificação pulsante */}
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                </Button>

                <ModeToggle />

                {/* Separator Vertical */}
                <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

                {/* User Dropdown (Shadcn) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-border/50 bg-muted/50 hover:bg-muted transition-all p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <span className="font-bold text-sm text-primary">{userEmail[0].toUpperCase()}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Minha Conta</p>
                                <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {/* Link para a página de Perfil */}
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href="/client/perfil" className="flex items-center w-full">
                                <User className="mr-2 h-4 w-4 text-muted-foreground" /> Perfil
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Configurações
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Logout Funcional */}
                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" /> Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}