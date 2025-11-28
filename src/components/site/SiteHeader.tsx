import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import { Menu, ExternalLink, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Assumindo que você tem o componente Sheet do shadcn

export function SiteHeader() {
  return (
    // Header Sticky com Glassmorphism aprimorado
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">

        {/* 1. Logotipo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">

            {/* LOGO - TEMA CLARO */}
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

            {/* LOGO - TEMA ESCURO */}
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

        {/* 2. Navegação Desktop (Magic UI Style) */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/docs/manual">Documentação</NavLink>
          <NavLink href="/docs/duvidas">Dúvidas Frequentes</NavLink>
          <NavLink href="/docs/suporte">Suporte</NavLink>
          <NavLink href="/releases">Releases</NavLink>

          {/* Separator visual sutil */}
          <div className="h-4 w-px bg-border/50 mx-2" />

          <Link
            href="https://trilink.com.br"
            target="_blank"
            className="group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Institucional
            <ExternalLink className="h-3 w-3 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </nav>

        {/* 3. Ações e Mobile */}
        <div className="flex items-center gap-2 md:gap-4">

          <ModeToggle />

          <div className="hidden md:block">
            <Link href="/login">
              <Button size="sm" className="font-semibold shadow-sm hover:shadow-md transition-all">
                Entrar
                <ChevronRight className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </Link>
          </div>

          {/* Menu Mobile (Sheet) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 mt-6">
                <Link href="/" className="font-bold text-lg">Trilink Software</Link>
                <div className="flex flex-col gap-2">
                  <MobileNavLink href="/docs/manual">Documentação</MobileNavLink>
                  <MobileNavLink href="/docs/duvidas">Dúvidas Frequentes</MobileNavLink>
                  <MobileNavLink href="/docs/suporte">Suporte</MobileNavLink>
                  <MobileNavLink href="https://trilink.com.br" external>Institucional</MobileNavLink>
                </div>
                <div className="mt-auto border-t pt-6">
                  <Link href="/login">
                    <Button className="w-full">Acessar Portal</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

        </div>

      </div>
    </header>
  );
}

/* =======================================================
   COMPONENTES AUXILIARES
======================================================= */

// Link de Navegação Desktop (Estilo Botão Ghost com Hover suave)
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
    >
      {children}
    </Link>
  );
}

// Link de Navegação Mobile
function MobileNavLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center justify-between rounded-md p-2 text-base font-medium transition-colors hover:bg-muted"
    >
      {children}
      {external ? <ExternalLink className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
    </Link>
  );
}