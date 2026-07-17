"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Badge, Button } from "@dosc-syspro/ui";
import { Search, Info } from "lucide-react";
import { formatDateTime } from "../../host-details.helpers";

type Props = {
  systemSnapshot: Record<string, unknown> | null;
  sysproProcessSnapshot: Array<Record<string, unknown>> | null;
  sysproProcessSnapshotAt: string | null;
};

export function DiagnosticsServicesView({ systemSnapshot, sysproProcessSnapshot, sysproProcessSnapshotAt }: Props) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const displayDate = sysproProcessSnapshotAt ? formatDateTime(sysproProcessSnapshotAt) : "Nunca";

  // Aqui tentamos consolidar serviços. Se a telemetria vier num formato específico futuramente, ajustamos.
  const parsedServices = useMemo(() => {
    let rawList: any[] = [];
    
    // Tenta encontrar uma lista de serviços no systemSnapshot
    if (systemSnapshot && Array.isArray(systemSnapshot.services)) {
      rawList = systemSnapshot.services;
    } 
    // Ou usa o sysproProcessSnapshot se ele contiver serviços
    else if (Array.isArray(sysproProcessSnapshot)) {
      rawList = sysproProcessSnapshot;
    }

    return rawList.map((srv: any) => {
      const name = (srv.displayName || srv.name || srv.Caption || "Desconhecido") as string;
      const internalName = (srv.name || srv.Name || "") as string;
      const startMode = (srv.startMode || srv.StartMode || "Desconhecido") as string;
      const account = (srv.startName || srv.account || srv.StartName || "Desconhecido") as string;
      const state = (srv.state || srv.State || srv.status || "Desconhecido") as string;

      return {
        id: internalName || name,
        name: name.trim(),
        internalName: internalName.trim(),
        startMode: startMode.trim(),
        account: account.trim(),
        state: state.trim(),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [systemSnapshot, sysproProcessSnapshot]);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return parsedServices;
    
    return parsedServices.filter(
      (srv) =>
        srv.name.toLowerCase().includes(query) ||
        srv.internalName.toLowerCase().includes(query) ||
        srv.state.toLowerCase().includes(query)
    );
  }, [parsedServices, search]);

  const totalPages = Math.ceil(filteredServices.length / PAGE_SIZE) || 1;
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredServices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredServices, currentPage]);

  const getStateColor = (state: string) => {
    const s = state.toLowerCase();
    if (s.includes("run") || s.includes("rodando") || s.includes("execut")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (s.includes("stop") || s.includes("parad")) return "bg-muted text-muted-foreground border-border";
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Serviços do Windows</CardTitle>
            <CardDescription>
              Serviços identificados pelo agente durante a coleta de inventário.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displayDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filtrar por nome do serviço ou estado..."
              className="pl-9 h-10 w-full max-w-md"
            />
          </div>

          {filteredServices.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/60">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Serviço</th>
                    <th className="p-4 hidden md:table-cell">Nome Interno</th>
                    <th className="p-4 hidden lg:table-cell">Inicialização</th>
                    <th className="p-4 hidden lg:table-cell">Conta</th>
                    <th className="p-4 text-right">Estado na Coleta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedServices.map((srv, index) => (
                    <tr key={`${srv.id}-${index}`} className="hover:bg-muted/5 transition-colors">
                      <td className="p-4 font-medium text-foreground">
                        {srv.name}
                        <div className="md:hidden text-xs text-muted-foreground mt-1 font-normal">
                          {srv.internalName}
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {srv.internalName}
                      </td>
                      <td className="p-4 hidden lg:table-cell text-xs text-muted-foreground">
                        {srv.startMode}
                      </td>
                      <td className="p-4 hidden lg:table-cell text-xs text-muted-foreground">
                        {srv.account}
                      </td>
                      <td className="p-4 text-right">
                        <Badge variant="outline" className={getStateColor(srv.state)}>
                          {srv.state}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center bg-muted/10">
              <Info className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhum serviço correspondente encontrado</p>
            </div>
          )}

          {filteredServices.length > 0 && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Exibindo {Math.min(filteredServices.length, (currentPage - 1) * PAGE_SIZE + 1)} a{" "}
                {Math.min(filteredServices.length, currentPage * PAGE_SIZE)} de {filteredServices.length}{" "}
                serviços.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Anterior
                </Button>
                <span className="text-xs font-medium text-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
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
