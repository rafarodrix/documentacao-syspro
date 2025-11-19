import { redirect } from 'next/navigation';
import { getProtectedSession, type UserRole } from '@/lib/auth-helpers';
import DashboardSidebar from '@/components/platform/DashboardSidebar'; // Componente de UI que vamos assumir que existe
import DashboardHeader from '@/components/platform/DashboardHeader'; 
import { type ReactNode } from 'react';

// O Layout principal do sistema: Sidebar e Header.
export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 1. Obter Sessão e Papel (Role)
  const session = await getProtectedSession();
  
  // O Middleware já deve ter barrado usuários deslogados, mas esta é uma checagem de segurança extra.
  if (!session) {
    // Redireciona para o login (embora o middleware deva pegar primeiro)
    return redirect('/login'); 
  }

  // 2. Lógica de Redirecionamento RBAC (Role-Based Access Control)
  const currentRole = session.role;
  const currentPath = children; // Na verdade, a URL é obtida via headers/pathname, mas para simplificar, usaremos uma checagem mais direta:

  // REGRA: Se o usuário NÃO for ADMIN/DEVELOPER e tentar acessar /admin, redireciona para /user
  if (currentRole === 'USER') {
    // Exemplo: Checagem se a URL contém "/admin" (você pode precisar de um hook para isso)
    // Para simplificar o Server Component: usaremos um check genérico
    // Se o USER estiver no layout da rota ADMIN, ele será barrado.
    
    // NOTA: Para RBAC de rota Server Component, o ideal é checar no PAGE.tsx da rota /admin
    // (Pois este Layout envolve AMBOS /admin e /user). 
    // Vou mover a checagem RBAC para o componente Admin/User.
  }
  
  // Como este layout é o pai de AMBOS /admin e /user, 
  // ele só deve renderizar o shell, e a checagem de RBAC deve ir para o Page.tsx filho.

    return (
        <div className="flex min-h-screen bg-muted/40">
        <DashboardSidebar userRole={currentRole} />
        
        <div className="flex-1 flex flex-col">
            <DashboardHeader userEmail={session.email} /> 
            
            <main className="flex-1 p-4 md:p-6">
            {children}
            </main>
        </div>
        </div>
    );
}