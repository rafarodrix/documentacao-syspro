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

            {/* --- SIDEBAR (Desktop) --- */}
            {/* Mudança: bg-background para um visual mais limpo e border-r sutil */}
            <div className="hidden border-r border-border/40 bg-background md:block h-full relative">
                <div className="sticky top-0 flex h-full max-h-screen flex-col gap-2">
                    <ClientSidebar />
                </div>
            </div>

            {/* --- ÁREA PRINCIPAL --- */}
            <div className="flex flex-col min-h-screen">
                {/* Header */}
                {/* O Header geralmente já tem seu próprio background/blur */}
                <ClientHeader userEmail={session.email} />

                {/* Conteúdo */}
                {/* Mudança: bg-muted/20 para contraste ideal com os Cards do Dashboard */}
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8 bg-muted/20 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}