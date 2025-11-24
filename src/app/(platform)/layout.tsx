import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

// 1. IMPORT CORRIGIDO: Importamos a função E o tipo UserRole
import { getProtectedSession, type UserRole } from '@/lib/auth-helpers';

import DashboardSidebar from '@/components/platform/DashboardSidebar';
import DashboardHeader from '@/components/platform/DashboardHeader';

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 1. Obter Sessão
  const session = await getProtectedSession();

  // 2. Checagem de Segurança
  if (!session) {
    redirect('/login');
  }

  // 3. Lógica de Tipagem
  // Agora o TypeScript sabe o que é 'UserRole' porque o importamos acima
  const currentRole = session.role as UserRole; 

  return (
    // Adicionado w-full para garantir largura total
    <div className="flex min-h-screen w-full bg-muted/40">
      
      {/* Sidebar Fixa à esquerda */}
      <DashboardSidebar userRole={currentRole} />
      
      {/* Área de Conteúdo Principal */}
      <div className="flex flex-col flex-1">
        <DashboardHeader userEmail={session.email} />
        
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}