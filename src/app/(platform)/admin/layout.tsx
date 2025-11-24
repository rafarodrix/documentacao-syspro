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

  // --- ADICIONE ESTE LOG AQUI ---
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

      {/* Sidebar Específica de Admin */}
      <AdminSidebar />

      <div className="flex flex-col">
        {/* Header Específico de Admin */}
        <AdminHeader userEmail={session.email} userRole={currentRole} />

        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}