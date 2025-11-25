import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession, type UserRole } from '@/lib/auth-helpers';
import { AdminSidebar } from '@/components/platform/admin/AdminSidebar';
import { AdminHeader } from '@/components/platform/admin/AdminHeader';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getProtectedSession();

  if (!session) redirect('/login');

  // --- LOGS DE DEBUG DE ACESSO ---
  console.log("🔍 DEBUG ADMIN ACCESS:");
  console.log("Email:", session.email);
  console.log("Role no Banco:", session.role);
  // ------------------------------

  const allowedRoles = ['ADMIN', 'DEVELOPER', 'SUPORTE'];

  if (!allowedRoles.includes(session.role)) {
    console.log("⛔ Acesso Negado! Redirecionando para /client");
    redirect('/client');
  }

  const currentRole = session.role as UserRole;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">

      {/* --- SIDEBAR (Desktop) --- */}
      {/* Visual limpo (bg-background) com borda sutil e comportamento sticky */}
      <div className="hidden border-r border-border/40 bg-background md:block h-full relative">
        <div className="sticky top-0 flex h-full max-h-screen flex-col gap-2">
          <AdminSidebar />
        </div>
      </div>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="flex flex-col min-h-screen">
        {/* Header Específico de Admin */}
        <AdminHeader userEmail={session.email} userRole={currentRole} />

        {/* Conteúdo Principal */}
        {/* Fundo bg-muted/20 para destacar os cards brancos do dashboard */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-8 lg:p-8 bg-muted/20 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}