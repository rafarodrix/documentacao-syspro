import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Menu, ExternalLink } from "lucide-react"; // Importando ícones úteis

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">

        {/* 1. Logotipo Dinâmico */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-85">

            {/* LOGO - TEMA CLARO 
                Exibe quando o sistema está no modo light (classe dark:hidden esconde no escuro)
            */}
            <div className="relative h-8 w-32 dark:hidden">
              <Image
                src="/logo/logo-escura.png"
                alt="Trilink Software"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 768px) 100px, 130px"
              />
            </div>

            {/* LOGO - TEMA ESCURO 
                Exibe quando o sistema está no modo dark (classe hidden dark:block exibe no escuro)
            */}
            <div className="relative h-8 w-32 hidden dark:block">
              <Image
                src="/logo/logo-clara.png"
                alt="Trilink Software"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 768px) 100px, 130px"
              />
            </div>
          </Link>
        </div>

        {/* 2. Navegação Desktop (Centralizada e Elegante) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <NavLink href="/docs/manual">Documentação</NavLink>
          <NavLink href="/docs/duvidas">Dúvidas Frequentes</NavLink>
          <NavLink href="/docs/suporte">Suporte</NavLink>

          {/* Link Externo Opcional (Ex: Site Institucional) */}
          <Link
            href="https://trilink.com.br"
            target="_blank"
            className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
          >
            Institucional <ExternalLink className="h-3 w-3" />
          </Link>
        </nav>

        {/* 3. Ações e Menu Mobile */}
        <div className="flex items-center gap-4">

          {/* Toggle de Tema */}
          <ModeToggle />

          {/* Botão de Login (Desktop) */}
          <div className="hidden md:block">
            <Link href="/login">
              <Button size="sm" className="px-5 font-semibold shadow-sm">
                Entrar
              </Button>
            </Link>
          </div>

          {/* Menu Mobile (Hambúrguer) - Visível apenas em telas pequenas */}
          <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>

        </div>

      </div>
    </header>
  );
}

/* =======================================================
   COMPONENTE AUXILIAR: LINK DE NAVEGAÇÃO
   Padroniza o estilo e hover dos links do menu
======================================================= */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative text-muted-foreground transition-colors hover:text-foreground group py-2"
    >
      {children}
      {/* Efeito de sublinhado animado sutil */}
      <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />
    </Link>
  );
}