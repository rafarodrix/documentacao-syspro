"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
    LayoutDashboard,
    LifeBuoy,
    BookOpen,
    LogOut,
    Ticket,
    User
} from "lucide-react";

// Itens de menu
const navItems = [
    { title: "Visão Geral", href: "/client", icon: LayoutDashboard },
    { title: "Meus Chamados", href: "/client/chamados", icon: Ticket },
    { title: "Meu Perfil", href: "/client/perfil", icon: User },
];

interface ClientSidebarProps {
    mobile?: boolean; // Nova prop para ajustar estilos
}

export function ClientSidebar({ mobile = false }: ClientSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    return (
        // Se for mobile, removemos a largura fixa e a posição sticky, pois o Sheet controla isso.
        // Se for desktop, mantemos a estrutura fixa original.
        <div className={cn(
            "flex h-full flex-col gap-2",
            !mobile && "hidden border-r bg-muted/40 md:block md:w-64 lg:w-72 h-screen sticky top-0"
        )}>

            {/* Logo / Título (Oculto no mobile pois o Sheet já tem header ou não precisa) */}
            {!mobile && (
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/client" className="flex items-center gap-2 font-semibold">
                        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white">
                            <span className="font-bold">C</span>
                        </div>
                        <span className="">Área do Cliente</span>
                    </Link>
                </div>
            )}

            {/* Navegação Principal */}
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                    isActive
                                        ? "bg-muted text-primary font-semibold"
                                        : "text-muted-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}

                    {/* Separador */}
                    <div className="my-2 border-t border-border/50" />

                    {/* Links Externos */}
                    <Link
                        href="/docs"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <BookOpen className="h-4 w-4" />
                        Documentação
                    </Link>

                    <Link
                        href="/suporte"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                        <LifeBuoy className="h-4 w-4" />
                        Central de Ajuda
                    </Link>
                </nav>
            </div>

            {/* Footer / Logout */}
            <div className="mt-auto p-4 border-t">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                    <LogOut className="h-4 w-4" />
                    Sair
                </button>
            </div>
        </div>
    );
}