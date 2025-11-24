// src/components/platform/DashboardHeader.tsx
// Este arquivo é um Server Component - Focado no layout

import { Avatar, AvatarFallback } from '@/components/ui/avatar'; 
import { Search } from 'lucide-react';
// Importa o novo componente Client-side
import { LogoutButton } from './LogoutButton'; 
import { Input } from '@/components/ui/input';

interface HeaderProps {
  userEmail: string;
}

export default function DashboardHeader({ userEmail }: HeaderProps) {
  // Gera iniciais de forma segura, garantindo que o email exista
  const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'US';

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      
      {/* 1. Título/Menu Mobile (Visível apenas em Mobile) */}
      <div className="md:hidden flex items-center gap-3">
        <span className="font-semibold text-lg text-primary">Syspro</span>
      </div>

      {/* 2. Barra de Pesquisa Central (Foco em funcionalidade) */}
      <div className="flex-1 max-w-lg hidden md:flex">
         <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
                type="search" 
                placeholder="Buscar em Manuais ou Ferramentas..." 
                className="w-full rounded-lg bg-muted pl-9 pr-4 text-sm"
            />
         </div>
      </div>

      {/* 3. Perfil e Logout (Alinhado à direita) */}
      <div className="ml-auto flex items-center gap-3">
        
        {/* Email do Usuário */}
        <span className="text-sm font-medium hidden lg:inline text-foreground/80">
            {userEmail}
        </span>
        
        {/* Avatar */}
        <Avatar>
          <AvatarFallback className='bg-primary/10 text-primary font-bold'>{initials}</AvatarFallback>
        </Avatar>

        {/* Botão de Logout (Componente Cliente) */}
        <LogoutButton />
      </div>
    </header>
  );
}