import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';
import { getProtectedSession } from '@/lib/auth-helpers';
import { TooltipProvider } from "@/components/ui/tooltip";
export default async function PlatformRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 1. Apenas verifica se está autenticado (Security Guard)
  const session = await getProtectedSession();

  if (!session) {
    redirect('/login');
  }

  // 2. Renderiza o layout base da área logada
  return (
    /* TooltipProvider: Necessário para tooltips em Sidebars e botões de ação.
       bg-background: Garante a cor base do tema para evitar "flashes" brancos/transparentes.
    */
    <TooltipProvider>
      <div className="min-h-screen w-full bg-background font-sans antialiased">
        {children}
      </div>
    </TooltipProvider>
  );
}