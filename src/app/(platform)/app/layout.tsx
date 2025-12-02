import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession } from '@/lib/auth-helpers';
import { ClientSidebar } from '@/components/platform/app/sidebar/ClientSidebar';
import { ClientHeader } from '@/components/platform/app/header/ClientHeader';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Sparkles } from "lucide-react";
import Link from 'next/link';

export default async function ClientLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getProtectedSession();

    // 1. Redireciona se não houver sessão
    if (!session) redirect('/login');

    // 2. Prepara o objeto de usuário
    const userForSidebar = {
        name: (session as any).name || session.email.split('@')[0] || "Usuário",
        email: session.email,
        image: (session as any).image || null,
        role: session.role
    };

    return (
        <div className="flex h-screen w-full bg-muted/5 overflow-hidden">

            {/* --- SIDEBAR DESKTOP (Fixa à Esquerda) --- */}
            <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r bg-background">
                <ClientSidebar user={userForSidebar} />
            </aside>

            {/* --- ÁREA PRINCIPAL --- */}
            <div className="flex-1 flex flex-col md:pl-72 transition-all duration-300 ease-in-out h-full">

                {/* HEADER (Sticky no topo) */}
                <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 h-16 flex items-center px-4 sm:px-6 justify-between">

                    {/* Lado Esquerdo (Mobile: Menu / Desktop: Título ou Vazio) */}
                    <div className="flex items-center gap-2">
                        {/* Botão Menu (Apenas Mobile) */}
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-ml-2">
                                        <Menu className="h-6 w-6" />
                                        <span className="sr-only">Abrir menu</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-72">
                                    {/* Sidebar em modo Mobile */}
                                    <ClientSidebar user={userForSidebar} mobile />
                                </SheetContent>
                            </Sheet>
                        </div>

                        {/* Logo/Nome Mobile */}
                        <Link href="/app" className="md:hidden flex items-center gap-2 font-semibold">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <span>Portal</span>
                        </Link>
                    </div>

                    {/* Lado Direito (Header do Cliente - Perfil, Notificações, etc) */}
                    <div className="flex flex-1 justify-end md:justify-between items-center pl-2">
                        {/* Espaço para Breadcrumbs no futuro (Desktop) */}
                        <div className="hidden md:block"></div>

                        <ClientHeader user={userForSidebar} />
                    </div>
                </header>

                {/* Main Content (Scroll independente) */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
                    {/* Container centralizado para telas ultrawide */}
                    <div className="max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}