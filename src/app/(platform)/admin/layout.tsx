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

  // 1. Verificação de Sessão
  if (!session) redirect('/login');

  // 2. Verificação de Permissão (RBAC)
  // Apenas estes perfis podem ver o layout Admin
  const allowedRoles = ['ADMIN', 'DEVELOPER', 'SUPORTE'];
  if (!allowedRoles.includes(session.role)) {
    redirect('/app');
  }

  const currentRole = session.role as UserRole;

  // 3. Preparação do Objeto de Usuário para a Sidebar
  // Sanitizamos os dados para evitar erros de tipagem no componente visual
  const userForSidebar = {
    name: (session as any).name || session.email.split('@')[0] || "Administrador",
    email: session.email,
    image: (session as any).image || null,
    role: session.role
  };

  return (
    <div className="flex h-screen w-full bg-muted/5 overflow-hidden">

      {/* --- SIDEBAR (Desktop) --- */}
      {/* Fixa à esquerda (w-72), altura total (h-full), z-index alto */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50">
        <AdminSidebar user={userForSidebar} />
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      {/* Empurrada para a direita (pl-72) para não ficar embaixo da sidebar */}
      <div className="flex-1 flex flex-col md:pl-72 transition-all duration-300 ease-in-out h-full">

        {/* Header (Sticky) */}
        {/* Fica fixo no topo enquanto o conteúdo rola por baixo */}
        <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
          <AdminHeader userEmail={session.email} userRole={currentRole} />
        </header>

        {/* Conteúdo Scrollável */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">

          {/* Container Centralizado */}
          {/* Limita a largura em telas ultrawide (ex: 34" curvados) para não quebrar o layout */}
          <div className="max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>

        </main>

      </div>
    </div>
  );
}