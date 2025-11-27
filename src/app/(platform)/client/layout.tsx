import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession } from '@/lib/auth-helpers';
import { ClientSidebar } from '@/components/platform/client/ClientSidebar';
import { ClientHeader } from '@/components/platform/client/ClientHeader';

export default async function ClientLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getProtectedSession();

    // 1. Redireciona se não houver sessão
    if (!session) redirect('/login');

    // 2. Prepara o objeto de usuário sanitizado
    // Cria um objeto seguro com fallback para o nome, garantindo que a UI não quebre
    const userForSidebar = {
        name: (session as any).name || session.email.split('@')[0] || "Usuário",
        email: session.email,
        image: (session as any).image || null,
        role: session.role
    };

    return (
        <div className="flex h-screen w-full bg-muted/5 overflow-hidden">

            {/* --- SIDEBAR (Desktop - Fixa à Esquerda) --- */}
            <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50">
                <ClientSidebar user={userForSidebar} />
            </aside>

            {/* --- ÁREA PRINCIPAL (Scrollável) --- */}
            {/* md:pl-72 compensa a largura da sidebar fixa */}
            <div className="flex-1 flex flex-col md:pl-72 transition-all duration-300 ease-in-out h-full">

                {/* Header (Sticky no topo) */}
                <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
                    <ClientHeader user={userForSidebar} />
                </header>

                {/* Main Content (Scroll independente) */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
                    {/* Container centralizado para telas muito largas (Ultrawide) */}
                    <div className="max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}