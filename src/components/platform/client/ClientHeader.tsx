import { ModeToggle } from "@/components/mode-toggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientHeaderProps {
    userEmail: string;
}

export function ClientHeader({ userEmail }: ClientHeaderProps) {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10 backdrop-blur-md bg-background/80">

            {/* Título da Página (Pode ser dinâmico ou breadcrumb futuramente) */}
            <div className="w-full flex-1">
                <h2 className="text-sm font-medium text-muted-foreground">
                    Portal do Cliente
                </h2>
            </div>

            {/* Ações do Header */}
            <div className="flex items-center gap-4">

                {/* Botão de Notificações (Placeholder) */}
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notificações</span>
                </Button>

                <ModeToggle />

                {/* Perfil do Usuário */}
                <div className="flex items-center gap-3 pl-2 border-l ml-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium leading-none">Minha Conta</p>
                        <p className="text-xs text-muted-foreground mt-1">{userEmail}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                        {userEmail[0].toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
}