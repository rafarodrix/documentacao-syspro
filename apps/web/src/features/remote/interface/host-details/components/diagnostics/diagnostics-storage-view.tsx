"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@dosc-syspro/ui";
import { HardDrive, Info } from "lucide-react";
import { formatDateTime } from "../../host-details.helpers";
import { cn } from "@/lib/utils";

type Props = {
  diskSnapshot: Array<Record<string, unknown>> | null;
  diskSnapshotAt: string | null;
};

// Helper for byte formatting
function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || isNaN(bytes)) return "N/A";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DiagnosticsStorageView({ diskSnapshot, diskSnapshotAt }: Props) {
  const displayDate = diskSnapshotAt ? formatDateTime(diskSnapshotAt) : "Nunca";

  const volumes = useMemo(() => {
    if (!Array.isArray(diskSnapshot)) return [];

    return diskSnapshot.map((disk) => {
      const name = (disk.name || disk.Name || disk.volume || "Desconhecido") as string;
      const fileSystem = (disk.fileSystem || disk.FileSystem || "Desconhecido") as string;
      
      const totalBytes = Number(disk.size || disk.Size || disk.totalSpace || 0);
      const freeBytes = Number(disk.freeSpace || disk.FreeSpace || 0);
      
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      const usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

      return {
        id: name,
        name: name.trim(),
        fileSystem: fileSystem.trim(),
        totalBytes,
        freeBytes,
        usedBytes,
        usedPercent,
      };
    });
  }, [diskSnapshot]);

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Armazenamento Lógico</CardTitle>
            <CardDescription>
              Volumes formatados e montados identificados no dispositivo.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
            Última coleta: {displayDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {volumes.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/60">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 w-10"></th>
                    <th className="p-4">Volume</th>
                    <th className="p-4 hidden sm:table-cell">Sistema de Arquivos</th>
                    <th className="p-4 text-right">Capacidade</th>
                    <th className="p-4 text-right hidden md:table-cell">Livre</th>
                    <th className="p-4 text-right">Utilizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {volumes.map((vol) => {
                    const isWarning = vol.usedPercent > 85;
                    const isCritical = vol.usedPercent > 95;

                    return (
                      <tr key={vol.id} className="hover:bg-muted/5 transition-colors">
                        <td className="p-4 pr-0">
                          <HardDrive className={cn("h-5 w-5", isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground")} />
                        </td>
                        <td className="p-4 font-medium text-foreground">
                          {vol.name}
                        </td>
                        <td className="p-4 hidden sm:table-cell text-muted-foreground">
                          {vol.fileSystem}
                        </td>
                        <td className="p-4 text-right font-mono text-muted-foreground">
                          {formatBytes(vol.totalBytes)}
                        </td>
                        <td className="p-4 text-right hidden md:table-cell font-mono text-muted-foreground">
                          {formatBytes(vol.freeBytes)}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={cn("font-mono font-medium", isCritical ? "text-red-500" : isWarning ? "text-amber-500" : "text-foreground")}>
                              {vol.usedPercent.toFixed(1)}%
                            </span>
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full", isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary")}
                                style={{ width: `${Math.min(vol.usedPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 p-8 text-center bg-muted/10">
              <Info className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Nenhum volume reportado</p>
              <p className="mt-1 text-xs text-muted-foreground">Os dados de discos e volumes não estão disponíveis na telemetria atual.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
