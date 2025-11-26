import Link from 'next/link';
import { LayoutDashboard, Users, Code, BookOpen, Settings } from 'lucide-react';
import { UserRole } from '@/lib/auth-helpers';

// Definindo os links de navegação e as permissões necessárias
const navItems = [
  { href: '/client', icon: LayoutDashboard, label: 'Portal do Usuário', roles: ['USER', 'CLIENTE', 'ADMIN', 'DEVELOPER'] },
  { href: '/docs', icon: BookOpen, label: 'Documentação Oficial', roles: ['USER', 'CLIENTE', 'ADMIN', 'DEVELOPER'] },
  { href: '/admin', icon: Users, label: 'Gestão de Usuários', roles: ['ADMIN'] },
  { href: '/dev', icon: Code, label: 'Ferramentas Dev', roles: ['DEVELOPER', 'ADMIN'] },
];

interface SidebarProps {
  userRole: UserRole;
}

export default function DashboardSidebar({ userRole }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-background p-4 min-h-screen">

      {/* Título e Role */}
      <div className="text-xl font-bold text-primary mb-8">
        Syspro | {userRole}
      </div>

      {/* Navegação Principal com RBAC */}
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          // Renderiza o link SOMENTE se a role do usuário estiver incluída nas roles permitidas
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

      {/* Opções de Rodapé */}
      <div className="mt-auto pt-4 border-t">
        <Link href="/settings" className="flex items-center gap-3 p-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
          <Settings className="h-5 w-5" />
          Configurações
        </Link>
      </div>
    </aside>
  );
}