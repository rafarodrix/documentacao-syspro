"use client";

import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Button, Badge } from "@dosc-syspro/ui";
import { Search, Calendar, Folder, Copy, Check, Info, ChevronDown, ChevronRight, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../../host-details.helpers";

type Props = {
  softwareSnapshot: Array<Record<string, unknown>>;
  softwareSnapshotAt: string | null;
};

// Helper para formatar data YYYYMMDD para DD/MM/YYYY
function formatInstallDate(raw: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  if (clean.length === 8 && /^\d{8}$/.test(clean)) {
    return `${clean.substring(6, 8)}/${clean.substring(4, 6)}/${clean.substring(0, 4)}`;
  }
  return clean;
}

// Helper para padronizar arquitetura
function standardizeArch(raw: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (clean.includes("64")) return "x64";
  if (clean.includes("86") || clean.includes("32")) return "x86";
  if (clean.includes("arm")) return "ARM64";
  return raw;
}

export function InventorySoftwareView({ softwareSnapshot, softwareSnapshotAt }: Props) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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
        "Não informada";

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
        id: `${name}-${version}-${installLocation ?? "no-loc"}`,
        name: name.trim(),
        version: version.trim(),
        publisher: publisher.trim(),
        installDate: formatInstallDate(installDate),
        installLocation: installLocation ? installLocation.trim() : null,
        architecture: standardizeArch(architecture),
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

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displaySnapshotDate = softwareSnapshotAt ? formatDateTime(softwareSnapshotAt) : "Nunca";

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Softwares instalados</CardTitle>
            <CardDescription>
              Programas identificados no registro do Windows. {filteredSoftwares.length} softwares encontrados.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displaySnapshotDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Filtrar por nome, desenvolvedor, versão ou local de instalação..."
              className="pl-9 h-10 w-full max-w-md"
            />
          </div>

          {filteredSoftwares.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/60">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur-md z-10">
                  <tr className="border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 w-10"></th>
                    <th className="p-4">Programa</th>
                    <th className="p-4">Versão</th>
                    <th className="p-4 hidden md:table-cell">Desenvolvedor</th>
                    <th className="p-4 hidden lg:table-cell">Arquitetura</th>
                    <th className="p-4 hidden lg:table-cell">Instalado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedSoftwares.map((sw, index) => {
                    const isExpanded = expandedRows.has(sw.id);
                    return (
                      <React.Fragment key={sw.id}>
                        <tr
                          className={cn(
                            "hover:bg-muted/10 transition-colors cursor-pointer group",
                            isExpanded && "bg-muted/5"
                          )}
                          onClick={() => toggleRow(sw.id)}
                        >
                          <td className="p-4 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="p-4 font-medium text-foreground">
                            <span>{sw.name}</span>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "rounded px-1.5 py-0.5 font-mono text-xs text-foreground",
                              sw.version === "Não informada" ? "bg-muted text-muted-foreground" : "bg-muted/65 border border-border/30"
                            )}>
                              {sw.version}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs hidden md:table-cell">
                            {sw.publisher}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs hidden lg:table-cell">
                            {sw.architecture ? (
                              <Badge variant="outline" className="text-[10px] font-mono h-5 px-1.5">
                                {sw.architecture}
                              </Badge>
                            ) : (
                              "--"
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs hidden lg:table-cell">
                            {sw.installDate ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {sw.installDate}
                              </span>
                            ) : (
                              "--"
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/5">
                            <td colSpan={6} className="p-4 pt-2 pb-5 border-t-0">
                              <div className="pl-14 space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                      Diretório de Instalação
                                    </p>
                                    {sw.installLocation ? (
                                      <div className="flex items-center gap-2 group/copy">
                                        <Folder className="h-4 w-4 text-primary shrink-0" />
                                        <span className="font-mono text-xs text-foreground break-all">
                                          {sw.installLocation}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0 opacity-0 group-hover/copy:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyPath(sw.installLocation!);
                                          }}
                                          title="Copiar Caminho"
                                        >
                                          {copiedPath === sw.installLocation ? (
                                            <Check className="h-3 w-3 text-emerald-500" /> // ds-allow: status
                                          ) : (
                                            <Copy className="h-3 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Caminho não registrado</p>
                                    )}
                                  </div>
                                  
                                  {/* Mostrar dados ocultos em telas pequenas */}
                                  <div className="space-y-1 lg:hidden">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                      Detalhes Adicionais
                                    </p>
                                    <div className="text-xs text-foreground space-y-1">
                                      <p><span className="text-muted-foreground">Desenvolvedor:</span> {sw.publisher}</p>
                                      <p><span className="text-muted-foreground">Arquitetura:</span> {sw.architecture || "N/A"}</p>
                                      <p><span className="text-muted-foreground">Instalado em:</span> {sw.installDate || "N/A"}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center bg-muted/10">
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
    </div>
  );
}
