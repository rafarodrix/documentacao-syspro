import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import { Menu, ExternalLink, ChevronRight, LogOut, User, LayoutDashboard } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";

export async function SiteHeader() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  const user = session?.user as any;

  const dashboardUrl =
    user?.role === 'ADMIN' || user?.role === 'DEVELOPER' || user?.role === 'SUPORTE'
      ? '/admin'
      : '/app';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">

        {/* 1. Logotipo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="relative h-8 w-32 dark:hidden">
              <Image src="/logo/logo-escura.png" alt="Trilink Software" fill priority className="object-contain object-left" sizes="(max-width: 768px) 100px, 130px" />
            </div>
            <div className="relative h-8 w-32 hidden dark:block">
              <Image src="/logo/logo-clara.png" alt="Trilink Software" fill priority className="object-contain object-left" sizes="(max-width: 768px) 100px, 130px" />
            </div>
          </Link>
        </div>

        {/* 2. Navegação Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/docs/manual">Documentação</NavLink>
          <NavLink href="/docs/duvidas">Dúvidas Frequentes</NavLink>
          <NavLink href="/docs/suporte">Suporte</NavLink>
          <NavLink href="/releases">Releases</NavLink>
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

          {/* --- LÓGICA DE LOGADO / DESLOGADO (DESKTOP) --- */}
          <div className="hidden md:block">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-transparent">
                    <Avatar className="h-9 w-9 border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
                      <AvatarImage src={user.image || ""} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={dashboardUrl}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Acessar Painel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href={`${dashboardUrl}/perfil`}>
                      <User className="mr-2 h-4 w-4" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <SignOutButton />
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button size="sm" className="font-semibold shadow-sm hover:shadow-md transition-all">
                  Entrar
                  <ChevronRight className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </Link>
            )}
          </div>

          {/* --- MENU MOBILE (SHEET) --- */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 mt-6 h-full">
                <Link href="/" className="font-bold text-lg">Trilink Software</Link>

                {/* INFO DO USUÁRIO NO MOBILE */}
                {user && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium text-sm truncate">{user.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {user && (
                    <MobileNavLink href={dashboardUrl}>
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Acessar Painel
                    </MobileNavLink>
                  )}
                  <div className="h-px bg-border/50 my-2" />
                  <MobileNavLink href="/docs/manual">Documentação</MobileNavLink>
                  <MobileNavLink href="/docs/duvidas">Dúvidas Frequentes</MobileNavLink>
                  <MobileNavLink href="/docs/suporte">Suporte</MobileNavLink>
                  <MobileNavLink href="https://trilink.com.br" external>Institucional</MobileNavLink>
                </div>

                <div className="mt-auto border-t pt-6 pb-6">
                  {user ? (
                    <div className="space-y-2">
                      <Link href={dashboardUrl}>
                        <Button className="w-full" variant="default">Ir para o App</Button>
                      </Link>
                      <SignOutButton mobile />
                    </div>
                  ) : (
                    <Link href="/login">
                      <Button className="w-full">Acessar Portal</Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </header>
  );
}

// Componentes Auxiliares
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} className="flex items-center justify-between rounded-md p-2 text-base font-medium transition-colors hover:bg-muted">
      <span className="flex items-center">{children}</span>
      {external ? <ExternalLink className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
    </Link>
  );
}