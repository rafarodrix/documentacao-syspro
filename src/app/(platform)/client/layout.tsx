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

    if (!session) redirect('/login');

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">

            {/* Sidebar Fixa (Apenas Desktop) */}
            {/* 'hidden md:block' garante que ela suma em mobile, pois o Header vai mostrá-la via Sheet */}
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    {/* Passamos false para mobile pois é a versão desktop fixa */}
                    <ClientSidebar />
                </div>
            </div>

            <div className="flex flex-col">
                {/* Header (Contém o Trigger do Menu Mobile) */}
                <ClientHeader userEmail={session.email} />

                {/* Área de Conteúdo Principal */}
                {/* bg-muted/10 ou bg-gray-50/50 dá um contraste sutil contra os cards brancos */}
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8 bg-muted/10">
                    {children}
                </main>
            </div>
        </div>
    );
}