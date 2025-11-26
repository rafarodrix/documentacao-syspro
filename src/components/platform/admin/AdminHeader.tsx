import { ModeToggle } from "@/components/mode-toggle";
import { UserRole } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronRight, Command, LogOut, Search, Settings, User, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import Link from "next/link";

interface AdminHeaderProps {
    userEmail: string;
    userRole: UserRole;
}

export function AdminHeader({ userEmail, userRole }: AdminHeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/60 px-6 backdrop-blur-xl transition-all supports-[backdrop-filter]:bg-background/60">

            {/* --- LADO ESQUERDO: Breadcrumbs --- */}
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className="flex items-center hover:text-foreground transition-colors cursor-pointer">
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2 border border-primary/10">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">Admin</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-30" />
                <span className="bg-muted/50 px-2 py-0.5 rounded-md text-xs border border-border/50">
                    Painel de Controle
                </span>
            </div>

            {/* --- CENTRO: Barra de Busca (Command Palette Placeholder) --- */}
            <div className="flex-1 flex justify-center max-w-md mx-auto">
                <div className="relative w-full group hidden md:block">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <button className="flex h-9 w-full items-center rounded-lg border border-border/50 bg-muted/30 px-3 py-1 pl-9 text-sm text-muted-foreground shadow-sm transition-all hover:bg-muted/50 hover:border-primary/20 cursor-text text-left">
                        <span className="opacity-50 truncate">Buscar usuários, empresas...</span>
                        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex shadow-sm">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </button>
                </div>
            </div>

            <div className="flex-1 md:hidden" />

            {/* --- LADO DIREITO: Ações e Perfil --- */}
            <div className="flex items-center gap-3">

                {/* Notificações */}
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                </Button>

                <ModeToggle />

                <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 pl-0 pr-2 hover:bg-muted/50 rounded-full h-auto py-1">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-bold shadow-sm ring-2 ring-background ml-1">
                                {userEmail[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col items-start text-xs hidden sm:flex">
                                <span className="font-medium leading-none truncate max-w-[100px]">{userEmail.split('@')[0]}</span>
                                <RoleBadge role={userRole} />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Administrador</p>
                                <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" /> Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Configurações
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" /> Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

/* --- Componente Auxiliar: Role Badge --- */
function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        'ADMIN': 'text-purple-600 dark:text-purple-400',
        'DEVELOPER': 'text-indigo-600 dark:text-indigo-400',
        'SUPORTE': 'text-orange-600 dark:text-orange-400',
    };

    return (
        <span className={`font-semibold text-[10px] mt-0.5 ${styles[role] || 'text-muted-foreground'}`}>
            {role}
        </span>
    );
}