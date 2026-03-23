import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  LifeBuoy,
  Menu,
} from "lucide-react";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function StaticSiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
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
            <div className="relative hidden h-8 w-32 dark:block">
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

        <nav className="hidden items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2 py-1 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                Documentação
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-72">
              <DropdownMenuItem asChild>
                <Link href="/docs" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Central de Ajuda
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/docs/manual" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Manual de Uso
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/docs/duvidas" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Dúvidas Frequentes
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/docs/treinamento" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Treinamentos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/docs/suporte" className="flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4" />
                  Suporte
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink href="/releases">Releases</NavLink>
          <div className="mx-2 h-4 w-px bg-border/50" />
          <Link
            href="https://www.trilink.com.br/public/downloads"
            target="_blank"
            className="group inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Downloads
            <ExternalLink className="h-3 w-3 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="https://trilink.com.br"
            target="_blank"
            className="group inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Institucional
            <ExternalLink className="h-3 w-3 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <ModeToggle />

          <div className="hidden md:block">
            <Link href="/login">
              <Button size="sm" className="font-semibold shadow-sm transition-all hover:shadow-md">
                Entrar
                <ChevronRight className="ml-1 h-3 w-3 opacity-50" />
              </Button>
            </Link>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="mt-6 flex h-full flex-col gap-6">
                <Link href="/" className="text-lg font-bold">Trilink Software</Link>

                <div className="flex flex-col gap-2">
                  <MobileNavLink href="/docs">Central</MobileNavLink>
                  <MobileNavLink href="/docs/manual">Manual de uso</MobileNavLink>
                  <MobileNavLink href="/docs/duvidas">Dúvidas frequentes</MobileNavLink>
                  <MobileNavLink href="/docs/treinamento">Treinamentos</MobileNavLink>
                  <MobileNavLink href="/docs/suporte">Suporte</MobileNavLink>
                  <MobileNavLink href="/releases">Releases</MobileNavLink>
                  <MobileNavLink href="https://www.trilink.com.br/public/downloads" external>
                    Downloads
                  </MobileNavLink>
                  <MobileNavLink href="https://trilink.com.br" external>
                    Institucional
                  </MobileNavLink>
                </div>

                <div className="mt-auto border-t pb-6 pt-6">
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex h-9 w-max items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center justify-between rounded-md p-2 text-base font-medium transition-colors hover:bg-muted"
    >
      <span className="flex items-center">{children}</span>
      {external ? <ExternalLink className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
    </Link>
  );
}

