"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Building2, ContactRound, FileText, Monitor, Search, Settings, Target, Ticket, Users, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { NavigationAccess } from "@/components/platform/app/layout/AppSidebar";
import { cn } from "@/lib/utils";

type SearchItem = {
  label: string;
  href: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
};

interface CommandPaletteTriggerProps {
  navigationAccess?: NavigationAccess;
}

export function CommandPaletteTrigger({ navigationAccess }: CommandPaletteTriggerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo<SearchItem[]>(() => {
    const allItems: Array<SearchItem & { enabled: boolean }> = [
      {
        label: "Dashboard",
        href: "/portal",
        keywords: "inicio painel dashboard portal home",
        icon: Search,
        enabled: navigationAccess?.dashboard !== false,
      },
      {
        label: "Empresas",
        href: "/portal/cadastros/empresa",
        keywords: "empresa empresas cadastro cnpj cliente",
        icon: Building2,
        enabled: navigationAccess?.companies !== false,
      },
      {
        label: "Usuarios",
        href: "/portal/cadastros/usuarios",
        keywords: "usuarios usuario equipe acesso perfil",
        icon: Users,
        enabled: navigationAccess?.users !== false,
      },
      {
        label: "Contatos",
        href: "/portal/contatos",
        keywords: "contatos contato telefone email whatsapp",
        icon: ContactRound,
        enabled: navigationAccess?.contacts !== false,
      },
      {
        label: "Tickets",
        href: "/portal/tickets",
        keywords: "tickets chamados suporte atendimento",
        icon: Ticket,
        enabled: navigationAccess?.tickets !== false,
      },
      {
        label: "CRM",
        href: "/portal/comercial/leads",
        keywords: "crm leads comercial oportunidades",
        icon: Target,
        enabled: navigationAccess?.crm !== false,
      },
      {
        label: "Plataforma Remota",
        href: "/portal/plataforma-remota",
        keywords: "plataforma remota acesso remoto rustdesk hosts",
        icon: Monitor,
        enabled: navigationAccess?.remote !== false,
      },
      {
        label: "Ferramentas",
        href: "/portal/tools",
        keywords: "ferramentas utilitarios consulta cnpj",
        icon: Wrench,
        enabled: navigationAccess?.tools !== false,
      },
      {
        label: "Configuracoes",
        href: "/portal/configuracoes",
        keywords: "configuracoes preferencias ajustes permissoes",
        icon: Settings,
        enabled: navigationAccess?.settings !== false,
      },
      {
        label: "Documentacao",
        href: "/portal/docs",
        keywords: "documentacao ajuda base conhecimento docs",
        icon: BookOpen,
        enabled: navigationAccess?.docs !== false,
      },
      {
        label: "Releases",
        href: "/portal/releases",
        keywords: "releases novidades changelog versoes",
        icon: FileText,
        enabled: navigationAccess?.releases !== false,
      },
    ];

    return allItems.filter((item) => item.enabled).map(({ enabled: _enabled, ...item }) => item);
  }, [navigationAccess]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => `${item.label.toLowerCase()} ${item.keywords}`.includes(term));
  }, [items, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const navigateTo = (href: string) => {
    setOpen(false);
    if (href !== pathname) {
      router.push(href);
      return;
    }
    router.refresh();
  };

  return (
    <>
      <button className="relative group w-full flex items-center" onClick={() => setOpen(true)} type="button">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <div className="flex h-9 w-full items-center rounded-xl border border-border/60 bg-muted/40 px-3 pl-10 text-sm text-muted-foreground shadow-sm transition-all hover:bg-background hover:border-primary/30 hover:shadow-md cursor-pointer">
          <span className="opacity-60 mr-auto truncate">Buscar páginas, módulos e atalhos...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background/70 px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex shadow-sm">
            <span className="text-xs">Ctrl</span>K
          </kbd>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl border-border/60 bg-background/95 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle>Busca rápida</DialogTitle>
          </DialogHeader>

          <div className="p-5 pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite para navegar pelo portal..."
                className="h-11 pl-10"
                autoFocus
              />
            </div>

            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-xl border border-border/50 bg-muted/10 p-2">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Nenhum resultado para essa busca.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href));

                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => navigateTo(item.href)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground",
                        )}
                      >
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", isActive ? "border-primary/20 bg-primary/10" : "border-border/50 bg-background")}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{item.label}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{item.href}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
