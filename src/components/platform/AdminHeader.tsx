import { ModeToggle } from "@/components/mode-toggle";
import { UserRole } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";

interface AdminHeaderProps {
    userEmail: string;
    userRole: UserRole;
}

export function AdminHeader({ userEmail, userRole }: AdminHeaderProps) {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10 backdrop-blur-md bg-background/80">

            {/* Lado Esquerdo: Título ou Breadcrumb (Placeholder) */}
            <div className="w-full flex-1">
                <h2 className="text-sm font-semibold text-muted-foreground">
                    Painel Administrativo
                </h2>
            </div>

            {/* Lado Direito: Ações e Perfil */}
            <div className="flex items-center gap-4">
                <ModeToggle />

                <div className="flex items-center gap-2 text-sm">
                    <div className="flex flex-col items-end">
                        <span className="font-medium">{userEmail}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            {userRole}
                        </Badge>
                    </div>
                    {/* Avatar Fallback (Círculo com inicial) */}
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {userEmail[0].toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
}