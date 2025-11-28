import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

// Sub-componentes
import { MobileMenu } from "./mobile-menu";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPaletteTrigger } from "./command-palette-trigger";
import { UserProfile } from "./user-profile";

interface ClientHeaderProps {
    user: {
        name: string;
        email: string;
        image?: string | null;
        role: string;
    };
}

export function ClientHeader({ user }: ClientHeaderProps) {
    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 px-6 backdrop-blur-xl transition-all">

            {/* --- ESQUERDA --- */}
            <div className="flex items-center gap-4">
                <MobileMenu user={user} />
                <Breadcrumbs />
            </div>

            {/* --- CENTRO (Busca) --- */}
            <div className="flex-1 flex justify-center max-w-xl mx-auto hidden md:flex">
                <CommandPaletteTrigger />
            </div>

            <div className="flex-1 md:hidden" />

            {/* --- DIREITA --- */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Notificações */}
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full h-9 w-9">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                </Button>

                <ModeToggle />

                <div className="h-5 w-px bg-border/60 mx-1 hidden sm:block" />

                <UserProfile user={user} />
            </div>
        </header>
    );
}