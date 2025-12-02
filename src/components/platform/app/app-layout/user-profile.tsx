"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ChevronUp, LogOut, Settings, HelpCircle, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfileProps {
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
}

export function UserProfile({ user }: UserProfileProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    // Formata a role para exibição (ex: CLIENT_ADMIN -> Gestor)
    const roleLabel = user.role === 'CLIENT_ADMIN' ? 'Gestor da Conta' : 'Usuário';

    return (
        <div className="p-3 border-t border-border/40 bg-muted/5">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-muted/80 transition-all outline-none group border border-transparent hover:border-border/50">
                        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
                            <AvatarImage src={user.image || ""} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-bold">
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
                        <ChevronUp className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-[240px] mb-2" side="top">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">Minha Conta</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {roleLabel}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer group">
                        <Settings className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary" />
                        Configurações
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer group">
                        <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary" />
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
    );
}