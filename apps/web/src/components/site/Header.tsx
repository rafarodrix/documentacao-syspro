import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  User,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { SYSTEM_ROLES } from "@dosc-syspro/core";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ModeToggle } from "@/components/ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export async function SiteHeader() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user as any;
  const canViewTechnical = user?.role && SYSTEM_ROLES.includes(user.role);
  const dashboardUrl = "/app";

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
                Documenta??o
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
                  D?vidas Frequentes
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
              {canViewTechnical ? (
                <DropdownMenuItem asChild>
                  <Link href="/docs/manuais-tecnicos" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Manuais T?cnicos
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? <NavLink href={dashboardUrl}>Aplica??o</NavLink> : null}
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
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-transparent">
                    <Avatar className="h-9 w-9 cursor-pointer border border-border/50 transition-all hover:ring-2 hover:ring-primary/20">
                      <AvatarImage src={user.image || ""} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 font-bold text-primary">
                        {user.name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="truncate text-xs leading-none text-muted-foreground">{user.email}</p>
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
                <Button size="sm" className="font-semibold shadow-sm transition-all hover:shadow-md">
                  Entrar
                  <ChevronRight className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </Link>
            )}
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

                {user && (
                  <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/50 p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || ""} />
                      <AvatarFallback>{user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {user ? (
                    <MobileNavLink href={dashboardUrl}>
                      <LayoutDashboard className="mr-2 h-4 w-4" /> Acessar Painel
                    </MobileNavLink>
                  ) : null}

                  <div className="my-2 h-px bg-border/50" />
                  <MobileNavLink href="/docs">Central</MobileNavLink>
                  <MobileNavLink href="/docs/manual">Manual de uso</MobileNavLink>
                  <MobileNavLink href="/docs/duvidas">D?vidas frequentes</MobileNavLink>
                  <MobileNavLink href="/docs/treinamento">Treinamentos</MobileNavLink>
                  <MobileNavLink href="/docs/suporte">Suporte</MobileNavLink>
                  {canViewTechnical ? (
                    <MobileNavLink href="/docs/manuais-tecnicos">Manuais t?cnicos</MobileNavLink>
                  ) : null}
                  <MobileNavLink href="/releases">Releases</MobileNavLink>
                  <MobileNavLink href="https://www.trilink.com.br/public/downloads" external>
                    Downloads
                  </MobileNavLink>
                  <MobileNavLink href="https://trilink.com.br" external>
                    Institucional
                  </MobileNavLink>
                </div>

                <div className="mt-auto border-t pb-6 pt-6">
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

