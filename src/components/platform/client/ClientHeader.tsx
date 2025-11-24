"use client"; // Precisa ser Client Component para interatividade do Sheet

import { ModeToggle } from "@/components/mode-toggle";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ClientSidebar } from "./ClientSidebar"; // Reutiliza a sidebar dentro do Sheet

interface ClientHeaderProps {
    userEmail: string;
}

export function ClientHeader({ userEmail }: ClientHeaderProps) {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10 backdrop-blur-md bg-background/80">

            {/* MENU MOBILE (Visível apenas em telas pequenas) */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0 w-72">
                    {/* Reutiliza o mesmo componente de Sidebar, mas dentro do Sheet */}
                    <ClientSidebar mobile />
                </SheetContent>
            </Sheet>

            {/* Título da Página */}
            <div className="w-full flex-1">
                <h2 className="text-sm font-medium text-muted-foreground">
                    Portal do Cliente
                </h2>
            </div>

            {/* Ações do Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notificações</span>
                    {/* Badge de notificação (exemplo) */}
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                </Button>

                <ModeToggle />

                {/* Perfil do Usuário */}
                <div className="flex items-center gap-3 pl-4 border-l border-border/40 ml-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium leading-none">Minha Conta</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{userEmail}</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-bold shadow-sm ring-2 ring-background">
                        {userEmail[0].toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
}