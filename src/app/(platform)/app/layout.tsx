import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession, type UserRole } from '@/lib/auth-helpers';
import { AdminSidebar } from '@/components/platform/app/admin-layout/AdminSidebar';
import { AdminHeader } from '@/components/platform/app/admin-layout/AdminHeader';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getProtectedSession();

  // 1. Verificação de Sessão
  if (!session) redirect('/login');

  // 2. Verificação de Permissão (RBAC)
  const allowedRoles = ['ADMIN', 'DEVELOPER', 'SUPORTE'];
  if (!allowedRoles.includes(session.role)) {
    redirect('/app');
  }

  const currentRole = session.role as UserRole;

  // 3. Dados do Usuário
  const userForSidebar = {
    name: (session as any).name || session.email.split('@')[0] || "Administrador",
    email: session.email,
    image: (session as any).image || null,
    role: session.role
  };

  return (
    <div className="flex h-screen w-full bg-muted/5 overflow-hidden">

      {/* --- SIDEBAR DESKTOP (Fixa) --- */}
      <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r bg-background">
        <AdminSidebar user={userForSidebar} />
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="flex-1 flex flex-col md:pl-72 transition-all duration-300 ease-in-out h-full">

        {/* HEADER (Mobile + Desktop) */}
        <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 h-16 flex items-center px-4 sm:px-6 justify-between">

          {/* Mobile: Botão Menu */}
          <div className="md:hidden flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                {/* Passamos mobile=true para adaptar o estilo */}
                {/* O componente Sidebar precisa suportar a prop onClose para fechar ao clicar, se implementado */}
                <AdminSidebar user={userForSidebar} mobile />
              </SheetContent>
            </Sheet>

            {/* Logo Mobile (Opcional) */}
            <Link href="/admin" className="ml-2 font-bold text-lg truncate">
              Trilink<span className="text-purple-600">Admin</span>
            </Link>
          </div>

          {/* Desktop/Mobile: Header Actions (Perfil, Notificações) */}
          <div className="flex flex-1 justify-end md:justify-between items-center">
            {/* Espaço vazio no desktop (pode ter breadcrumbs aqui) */}
            <div className="hidden md:block"></div>

            <AdminHeader userEmail={session.email} userRole={currentRole} />
          </div>
        </header>

        {/* CONTEÚDO SCROLLÁVEL */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}