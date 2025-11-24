import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession, type UserRole } from '@/lib/auth-helpers';
import { AdminSidebar } from '@/components/platform/AdminSidebar';
import { AdminHeader } from '@/components/platform/AdminHeader';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getProtectedSession();

  // (O PlatformLayout já checou se existe sessão, mas o TS pode reclamar, 
  // então pegamos de novo ou passamos via contexto. 
  // Por segurança e simplicidade, chamamos o helper que é muito rápido).

  if (!session) redirect('/login');

  // 🔒 SEGURANÇA RBAC (Role Based Access Control)
  // Se o cara não for Admin ou Dev, ele não pode ver essa tela.
  const allowedRoles = ['ADMIN', 'DEVELOPER', 'SUPORTE'];
  if (!allowedRoles.includes(session.role)) {
    // Redireciona para a área de cliente se ele tentar entrar no admin
    redirect('/client/dashboard');
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