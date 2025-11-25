import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">

        {/* 1. Logotipo Dinâmico */}
        <div className="flex items-center gap-2">
          <Link href="/" className="block hover:opacity-90 transition-opacity">

            {/* Cenário: Tema CLARO (Light Mode) 
               Mostramos a logo ESCURA (para dar contraste no fundo branco).
               A classe 'dark:hidden' esconde esta imagem quando o tema for escuro.
            */}
            <div className="relative h-8 w-auto dark:hidden">
              <Image
                src="/logo/logo-escura.png"
                alt="Trilink Software"
                width={150} // Ajuste conforme a proporção real da sua imagem
                height={32}
                priority // Carrega com prioridade (sem lazy load)
                className="h-8 w-auto object-contain"
              />
            </div>

            {/* Cenário: Tema ESCURO (Dark Mode) 
               Mostramos a logo CLARA (para dar contraste no fundo preto).
               A classe 'hidden dark:block' garante que ela só apareça no tema escuro.
            */}
            <div className="relative h-8 w-auto hidden dark:block">
              <Image
                src="/logo/logo-clara.png"
                alt="Trilink Software"
                width={150}
                height={32}
                priority
                className="h-8 w-auto object-contain"
              />
            </div>
          </Link>
        </div>

        {/* 2. Navegação Desktop */}
        <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/docs/manual" className="hover:text-primary transition-colors">
            Documentação
          </Link>
          <Link href="/docs/duvidas" className="hover:text-primary transition-colors">
            Dúvidas e Soluções
          </Link>
          <Link href="/docs/suporte" className="hover:text-primary transition-colors">
            Suporte
          </Link>
        </nav>

        {/* 3. Ações (Tema e Login) */}
        <div className="flex items-center gap-4">
          <ModeToggle />

          <Link href="/login">
            <Button variant="default" size="sm" className="px-6 font-semibold">
              Entrar
            </Button>
          </Link>
        </div>

      </div>
    </header>
  );
}