import Link from 'next/link';
import { LayoutDashboard, Users, Code, BookOpen, Settings } from 'lucide-react';
import { UserRole } from '@/lib/auth-helpers'; // Importa o tipo definido

interface SidebarProps {
  userRole: UserRole;
}

const navItems = [
  { href: '/user', icon: LayoutDashboard, label: 'Portal do Usuário', roles: ['USER', 'ADMIN', 'DEVELOPER'] },
  { href: '/docs', icon: BookOpen, label: 'Documentação Oficial', roles: ['USER', 'ADMIN', 'DEVELOPER'] },
  { href: '/admin', icon: Users, label: 'Gestão de Usuários', roles: ['ADMIN'] },
  { href: '/dev', icon: Code, label: 'Ferramentas Dev', roles: ['DEVELOPER', 'ADMIN'] },
];

export default function DashboardSidebar({ userRole }: SidebarProps) {
  const isAdminOrDev = userRole === 'ADMIN' || userRole === 'DEVELOPER';

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-background p-4 min-h-screen">
      
      {/* Logo/Título */}
      <div className="text-xl font-bold text-primary mb-8">
        Syspro | {userRole}
      </div>

      {/* Navegação */}
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          (item.roles.includes(userRole)) && (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 p-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        ))}
      </nav>
      
      {/* Rodapé da Sidebar (Exemplo) */}
      <div className="mt-auto pt-4 border-t">
         <Link href="/settings" className="flex items-center gap-3 p-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Settings className="h-5 w-5" />
            Configurações
         </Link>
      </div>
    </aside>
  );
}