import { Avatar, AvatarFallback } from '@/components/ui/avatar'; 
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  userEmail: string;
}

// Este deve ser um Client Component se o botão de Logout for funcionar com o Better Auth Client.
// Mas o shell (aqui) é um Server Component, então o botão de Logout deve ser um Client Component separado.

export default function DashboardHeader({ userEmail }: HeaderProps) {
  // Apenas o componente de Logout faria 'use client' e usaria authClient.signOut()
  
  const initials = userEmail.substring(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      
      {/* Espaço para o menu mobile ou título (no Desktop ele está oculto) */}
      <div className="flex-1 md:hidden">
         <span className="font-semibold text-primary">Syspro ERP</span>
      </div>

      {/* Barra de pesquisa, notificações, etc. (Opcional) */}
      <div className="flex-1">
        {/* Futura barra de pesquisa/notificações */}
      </div>

      {/* Perfil e Logout */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium hidden sm:inline text-foreground/80">
            {userEmail}
        </span>
        
        <Avatar>
          <AvatarFallback className='bg-primary/10 text-primary font-bold'>{initials}</AvatarFallback>
        </Avatar>

        {/* Placeholder para Logout - Deve ser um componente de Cliente separado */}
        <Link href="/logout" passHref>
             <Button variant="outline" size="icon" title="Sair do Portal">
                <LogOut className="h-5 w-5" />
             </Button>
        </Link>
      </div>
    </header>
  );
}