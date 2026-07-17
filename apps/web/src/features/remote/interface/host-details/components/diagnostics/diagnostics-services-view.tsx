"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Input, Badge, Button } from "@dosc-syspro/ui";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "../../host-details.helpers";

type Props = {
  systemSnapshot: Record<string, unknown> | null;
  sysproProcessSnapshot: Array<Record<string, unknown>> | null;
  sysproProcessSnapshotAt: string | null;
};

export function DiagnosticsServicesView({ sysproProcessSnapshot, sysproProcessSnapshotAt }: Props) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const displayDate = sysproProcessSnapshotAt ? formatDateTime(sysproProcessSnapshotAt) : "Nunca";

  const parsedServices = useMemo(() => {
    const rawList = Array.isArray(sysproProcessSnapshot) ? sysproProcessSnapshot : [];

    return rawList.map((srv: any) => {
      const internalName = (srv.name || srv.Name || srv.ServiceName || "") as string;
      const displayName = (srv.displayName || srv.DisplayName || srv.Caption || internalName || "Desconhecido") as string;
      const startType = (srv.startType || srv.StartType || srv.startMode || "Desconhecido") as string;
      const status = (srv.status || srv.state || srv.State || "Desconhecido") as string;
      const pid = (srv.pid || srv.ProcessId || 0) as number;
      const companyId = (srv.companyId || "") as string;

      return {
        id: internalName || displayName,
        internalName: internalName.trim(),
        displayName: displayName.trim(),
        startType: startType.trim(),
        status: status.trim(),
        pid,
        companyId,
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [sysproProcessSnapshot]);

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return parsedServices;
    
    return parsedServices.filter(
      (srv) =>
        srv.displayName.toLowerCase().includes(query) ||
        srv.internalName.toLowerCase().includes(query) ||
        srv.status.toLowerCase().includes(query)
    );
  }, [parsedServices, search]);

  const totalPages = Math.ceil(filteredServices.length / PAGE_SIZE) || 1;
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredServices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredServices, currentPage]);

  const getStateColor = (state: string) => {
    const s = state.toLowerCase();
    if (s === "running" || s.includes("rodando") || s.includes("execut")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (s === "stopped" || s.includes("parad")) return "bg-muted text-muted-foreground border-border";
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  };

  const formatStartType = (type: string) => {
    const t = type.toLowerCase();
    if (t === "auto" || t === "delayed_auto") return "Automático";
    if (t === "manual") return "Manual";
    if (t === "disabled") return "Desativado";
    return type;
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Processos Monitorados</CardTitle>
            <CardDescription>
              Serviços Syspro e processos críticos identificados pelo agente. {filteredServices.length} serviços listados.
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
                <thead className="bg-muted/50 backdrop-blur-md">
                  <tr className="border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Serviço</th>
                    <th className="p-4">Nome Interno</th>
                    <th className="p-4 hidden sm:table-cell">Tipo de Início</th>
                    <th className="p-4 hidden md:table-cell">PID</th>
                    <th className="p-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedServices.map((srv) => (
                    <tr key={srv.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-foreground">{srv.displayName}</div>
                        {srv.companyId && <div className="text-[10px] text-muted-foreground mt-0.5">Empresa ID: {srv.companyId}</div>}
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {srv.internalName}
                      </td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground text-xs">
                        {formatStartType(srv.startType)}
                      </td>
                      <td className="p-4 hidden md:table-cell font-mono text-muted-foreground text-xs">
                        {srv.pid > 0 ? srv.pid : "--"}
                      </td>
                      <td className="p-4 text-right">
                        <Badge variant="outline" className={getStateColor(srv.status)}>
                          {srv.status === "running" ? "Rodando" : srv.status === "stopped" ? "Parado" : srv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">
              Nenhum processo foi encontrado com esse filtro.
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-muted-foreground">
                Mostrando {((currentPage - 1) * PAGE_SIZE) + 1} até {Math.min(currentPage * PAGE_SIZE, filteredServices.length)} de {filteredServices.length}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm text-muted-foreground px-2">
                  {currentPage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
