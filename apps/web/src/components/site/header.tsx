import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  User,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ModeToggle } from "@/components/mode-toggle";
import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@dosc-syspro/ui";

export async function SiteHeader() {
  const session = await getProtectedSession();
  const user = session
    ? {
        email: session.email,
        name: session.name,
        image: session.image,
        role: session.role,
      }
    : null;
  const canViewTechnical = user ? await currentUserHasPermission("tools:all") : false;
  const dashboardUrl = "/portal";
  const docsNavItems = [
    {
      href: "/portal/docs/cliente",
      title: "Central de Ajuda",
      description: "Entrada principal com guias e acessos rapidos.",
      icon: BookOpen,
    },
    {
      href: "/portal/docs/cliente/manual",
      title: "Manual de Uso",
      description: "Fluxos operacionais e rotinas do sistema.",
      icon: BookOpen,
    },
    {
      href: "/portal/docs/cliente/duvidas",
      title: "Duvidas Frequentes",
      description: "Respostas diretas para problemas comuns.",
      icon: HelpCircle,
    },
    {
      href: "/portal/docs/cliente/treinamento",
      title: "Treinamentos",
      description: "Trilhas de capacitacao por modulo.",
      icon: GraduationCap,
    },
    {
      href: "/portal/docs/cliente/suporte",
      title: "Suporte",
      description: "Canais e orientacoes de atendimento.",
      icon: LifeBuoy,
    },
    ...(canViewTechnical
      ? [
          {
            href: "/portal/docs/admin",
            title: "Manuais Tecnicos",
            description: "Arquitetura, padroes e operacao tecnica.",
            icon: LayoutDashboard,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="relative h-8 w-32 dark:hidden">
              <Image
                src="/img/logo/logo-escura.png"
                alt="Trilink Software"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 768px) 100px, 130px"
              />
            </div>
            <div className="relative hidden h-8 w-32 dark:block">
              <Image
                src="/img/logo/logo-clara.png"
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
                Documentacao
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              sideOffset={10}
              className="w-[620px] rounded-2xl border-border/60 bg-background/95 p-3 shadow-2xl backdrop-blur-xl"
            >
              <div className="grid grid-cols-2 gap-2">
                {docsNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group rounded-xl border border-border/55 bg-muted/10 p-3.5 transition-colors hover:border-primary/35 hover:bg-primary/5"
                    >
                      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/50 bg-background/80 text-muted-foreground transition-colors group-hover:text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? <NavLink href={dashboardUrl}>Aplicacao</NavLink> : null}
          <NavLink href="/portal/releases">Releases</NavLink>
          <div className="mx-2 h-4 w-px bg-border/50" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                Institucional
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              <DropdownMenuItem asChild>
                <Link href="https://trilink.com.br" target="_blank" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Site institucional
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="https://www.trilink.com.br/public/downloads" target="_blank" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Area de downloads
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <ModeToggle />

          <div className="hidden md:block">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-transparent">
                    <Avatar className="h-9 w-9 cursor-pointer border border-border/50 transition-all hover:ring-2 hover:ring-primary/20">
                      <AvatarImage src={user.image || ""} alt={user.name ?? undefined} />
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
            <SheetContent side="right" className="w-75 sm:w-100">
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
                  <MobileNavLink href="/portal/docs">Central</MobileNavLink>
                  <MobileNavLink href="/portal/docs/cliente/manual">Manual de uso</MobileNavLink>
                  <MobileNavLink href="/portal/docs/cliente/duvidas">Duvidas frequentes</MobileNavLink>
                  <MobileNavLink href="/portal/docs/cliente/treinamento">Treinamentos</MobileNavLink>
                  <MobileNavLink href="/portal/docs/cliente/suporte">Suporte</MobileNavLink>
                  {canViewTechnical ? (
                    <MobileNavLink href="/portal/docs/admin">Manuais tecnicos</MobileNavLink>
                  ) : null}
                  <MobileNavLink href="/portal/releases">Releases</MobileNavLink>
                  <MobileNavLink href="https://trilink.com.br" external>
                    Institucional
                  </MobileNavLink>
                  <MobileNavLink href="https://www.trilink.com.br/public/downloads" external>
                    Area de downloads
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
