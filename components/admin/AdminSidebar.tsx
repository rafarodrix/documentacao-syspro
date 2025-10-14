"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Database, Settings, User } from "lucide-react";

// Definição dos links da navegação interna
const navLinks = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/consultas", label: "Consultas", icon: Search },
  { href: "/admin/scripts", label: "Scripts BD", icon: Database },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-card border-r h-screen flex flex-col justify-between p-4">
      <div>
        {/* Cabeçalho do Sidebar */}
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-primary">Painel Interno</h2>
          <p className="text-xs text-muted-foreground">Syspro Docs</p>
        </div>

        {/* Navegação Principal */}
        <nav className="space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground" // Estilo do link ativo
                      : "text-muted-foreground hover:bg-muted hover:text-foreground" // Estilo padrão
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Seção do Usuário no Rodapé (um placeholder por enquanto) */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Equipe Syspro</p>
            <p className="text-xs text-muted-foreground">Desenvolvimento</p>
          </div>
        </div>
      </div>
    </aside>
  );
}