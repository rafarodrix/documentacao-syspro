"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RemotePlatformDirectory } from "@/features/remote/domain/model";

export function RemotePlatformDirectoryPanel({ directory }: { directory: RemotePlatformDirectory }) {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return directory.items;

    return directory.items.filter((item) => {
      const haystack = [
        item.name,
        item.companyName,
        item.environment,
        item.provider,
        item.rustdeskId,
        item.description,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [directory.items, searchTerm]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Clientes/hosts configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directory.stats.totalHosts}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Hosts ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directory.stats.activeHosts}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Empresas no escopo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{directory.stats.companies}</p>
            <p className="text-sm text-muted-foreground">{directory.tenantScope.summary}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Clientes configurados</CardTitle>
          <CardDescription>
            Esta tela e operacional. A busca abaixo pesquisa somente os hosts deste modulo. A configuracao de hosts e vinculacoes fica em Configuracoes &gt; Acesso Remoto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Pesquisar host, empresa, ambiente ou RustDesk ID"
                className="pl-9"
              />
            </div>
            {searchTerm ? (
              <Button type="button" variant="outline" onClick={() => setSearchTerm("")}>
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            ) : null}
          </div>

          {filteredItems.length ? (
            filteredItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {item.id}</p>
                    <p className="text-sm text-muted-foreground">Empresa: {item.companyName ?? "Sem empresa"}</p>
                    <p className="text-sm text-muted-foreground">
                      Descricao: {item.description || "Host sem descricao operacional."}
                    </p>
                    <p className="text-xs text-muted-foreground">RustDesk ID: {item.rustdeskId ?? "Nao configurado"}</p>
                    <p className="text-xs text-muted-foreground">
                      Sessoes abertas: {item.openSessionCount}
                      {item.lastSessionAt ? ` | Ultima atividade: ${new Date(item.lastSessionAt).toLocaleString("pt-BR")}` : ""}
                    </p>
                  </div>

                  <Link
                    href={`/app/plataforma-remota/${item.id}`}
                    className={cn(buttonVariants({ variant: "default" }), "w-full lg:w-auto")}
                  >
                    Acessar
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? `Nenhum host deste modulo corresponde a "${searchTerm}".`
                : "Nenhum cliente/host remoto configurado no seu escopo."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
