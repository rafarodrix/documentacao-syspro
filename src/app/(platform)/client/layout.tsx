import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession, type UserRole } from '@/lib/auth-helpers';
import { ClientSidebar } from '@/components/platform/client/ClientSidebar';
import { ClientHeader } from '@/components/platform/client/ClientHeader';

export default async function ClientLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getProtectedSession();

    if (!session) redirect('/login');

    // Opcional: Se você quiser impedir que ADMINS vejam a área de clientes,
    // descomente a linha abaixo. Mas geralmente Admins podem ver tudo.
    // if (session.role !== 'CLIENTE' && session.role !== 'CLIENTE_ADMIN') redirect('/admin');

    const currentRole = session.role as UserRole;

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">

            {/* Sidebar Específica do Cliente */}
            <ClientSidebar />

            <div className="flex flex-col">
                {/* Header Específico do Cliente */}
                <ClientHeader userEmail={session.email} />

                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}