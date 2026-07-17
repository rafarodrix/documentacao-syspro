"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, Badge } from "@dosc-syspro/ui";
import { Search, Calendar, Folder, Copy, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../host-details.helpers";

type Props = {
  softwareSnapshot: Array<Record<string, unknown>>;
  softwareSnapshotAt: string | null;
  sysproVersionSnapshot: Array<Record<string, unknown>>;
};

export function HostSoftwareTab({ softwareSnapshot, softwareSnapshotAt, sysproVersionSnapshot }: Props) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const PAGE_SIZE = 15;

  const parsedSoftwares = useMemo(() => {
    if (!Array.isArray(softwareSnapshot)) return [];
    return softwareSnapshot.map((entry) => {
      const name =
        (entry["displayName"] as string) ||
        (entry["name"] as string) ||
        (entry["productName"] as string) ||
        (entry["title"] as string) ||
        "Sem Nome";

      const version =
        (entry["displayVersion"] as string) ||
        (entry["version"] as string) ||
        (entry["productVersion"] as string) ||
        "Sem Versão";

      const publisher =
        (entry["publisher"] as string) ||
        (entry["Publisher"] as string) ||
        (entry["vendor"] as string) ||
        "Desconhecido";

      const installDate = (entry["installDate"] as string) || (entry["InstallDate"] as string) || null;
      const installLocation = (entry["installLocation"] as string) || (entry["InstallLocation"] as string) || null;
      const architecture = (entry["architecture"] as string) || null;
      const source = (entry["source"] as string) || null;

      return {
        name: name.trim(),
        version: version.trim(),
        publisher: publisher.trim(),
        installDate: installDate ? installDate.trim() : null,
        installLocation: installLocation ? installLocation.trim() : null,
        architecture: architecture ? architecture.trim() : null,
        source: source ? source.trim() : null,
      };
    });
  }, [softwareSnapshot]);

  const filteredSoftwares = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return [...parsedSoftwares].sort((a, b) => a.name.localeCompare(b.name));
    }
    return parsedSoftwares
      .filter(
        (sw) =>
          sw.name.toLowerCase().includes(query) ||
          sw.publisher.toLowerCase().includes(query) ||
          (sw.installLocation && sw.installLocation.toLowerCase().includes(query)) ||
          sw.version.toLowerCase().includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parsedSoftwares, search]);

  const totalPages = Math.ceil(filteredSoftwares.length / PAGE_SIZE) || 1;
  const paginatedSoftwares = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredSoftwares.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredSoftwares, currentPage]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      // fallback silent
    }
  };

  const displaySnapshotDate = softwareSnapshotAt ? formatDateTime(softwareSnapshotAt) : "Nunca";

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Inventário de Softwares</CardTitle>
            <CardDescription>
              Lista de programas instalados lidos no registro do Windows pelo Go Agent.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Coletado em: {displaySnapshotDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filtrar por nome, desenvolvedor, versão ou local de instalação..."
              className="pl-9 h-10 w-full"
            />
          </div>

          {filteredSoftwares.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/60">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Programa</th>
                    <th className="p-4">Versão</th>
                    <th className="p-4">Desenvolvedor</th>
                    <th className="p-4 hidden md:table-cell">Data de Instalação</th>
                    <th className="p-4 hidden lg:table-cell">Local de Instalação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedSoftwares.map((sw, index) => (
                    <tr key={`${sw.name}-${sw.version}-${index}`} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-medium text-foreground">
                        <div className="flex flex-col">
                          <span>{sw.name}</span>
                          {sw.architecture && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Arquitetura: {sw.architecture}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="rounded bg-muted/65 border border-border/30 px-1.5 py-0.5 font-mono text-xs text-foreground">
                          {sw.version}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{sw.publisher}</td>
                      <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">
                        {sw.installDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {sw.installDate}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {sw.installLocation ? (
                          <div className="flex items-center gap-2 max-w-xs xl:max-w-md">
                            <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="font-mono text-xs text-muted-foreground truncate" title={sw.installLocation}>
                              {sw.installLocation}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 hover:bg-muted/40"
                              onClick={() => handleCopyPath(sw.installLocation!)}
                            >
                              {copiedPath === sw.installLocation ? (
                                <Check className="h-3 w-3 text-emerald-500" /> // ds-allow: status
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          "--"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
              <Info className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhum programa correspondente encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Tente alterar os termos da busca.</p>
            </div>
          )}

          {filteredSoftwares.length > 0 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Exibindo {Math.min(filteredSoftwares.length, (currentPage - 1) * PAGE_SIZE + 1)} a{" "}
                {Math.min(filteredSoftwares.length, currentPage * PAGE_SIZE)} de {filteredSoftwares.length}{" "}
                programas.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-xs font-medium text-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Pastas Físicas do Syspro</CardTitle>
            <CardDescription>
              Lista de instalações detectadas fisicamente no disco deste dispositivo.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Monitoramento Automático
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!sysproVersionSnapshot || sysproVersionSnapshot.length === 0) ? (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center bg-muted/10">
              <Folder className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhuma pasta física localizada</p>
              <p className="mt-1 text-xs text-muted-foreground">O agente não identificou diretórios correspondentes ao padrão do Syspro.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sysproVersionSnapshot.map((folder, idx) => {
                const path = typeof folder["path"] === "string" ? folder["path"] : "Desconhecido";
                const exeVersion = typeof folder["exeVersion"] === "string" ? folder["exeVersion"] : null;
                const exeExists = folder["exeExists"] === true;
                const exeSizeMB = typeof folder["exeSizeMB"] === "number" ? folder["exeSizeMB"] : null;

                return (
                  <div key={`${path}-${idx}`} className="rounded-xl border border-border/50 bg-background/50 shadow-sm p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-amber-500 shrink-0" />
                      <span className="font-mono text-sm break-all text-foreground font-medium" title={path}>
                        {path}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                      {exeExists ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] border-emerald-500/20 py-0.5">
                            v{exeVersion ?? "Não lida"}
                          </Badge>
                          {exeSizeMB !== null && (
                            <span className="text-xs text-muted-foreground">
                              {exeSizeMB.toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[11px] py-0.5 border-border">
                          Sem executável
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
