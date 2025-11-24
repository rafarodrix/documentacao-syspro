import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { LayoutDashboard } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        
        {/* 1. Logotipo / Home */}
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <Link href="/">Trilink Software</Link>
        </div>

        {/* 2. Navegação Desktop (Opcional - Adicione links aqui) */}
        <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/docs" className="hover:text-primary transition-colors">
            Documentação
          </Link>
          <Link href="/#features" className="hover:text-primary transition-colors">
            Recursos
          </Link>
          <Link href="/suporte" className="hover:text-primary transition-colors">
            Suporte
          </Link>
        </nav>

        {/* 3. Ações (Tema e Login) */}
        <div className="flex items-center gap-4">
          <ModeToggle />
          
          <Link href="/login">
            <Button variant="default" size="sm" className="px-6">
              Entrar
            </Button>
          </Link>
        </div>

      </div>
    </header>
  );
}