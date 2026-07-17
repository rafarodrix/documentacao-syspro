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

// Helper for formatting MB to readable sizes (GB/TB)
function formatMb(mb: number | null | undefined): string {
  if (mb == null || isNaN(mb)) return "N/A";
  if (mb === 0) return "0 MB";
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  
  const gb = mb / 1024;
  if (gb < 1024) return `${gb.toFixed(1)} GB`;
  
  const tb = gb / 1024;
  return `${tb.toFixed(2)} TB`;
}

export function DiagnosticsStorageView({ diskSnapshot, diskSnapshotAt }: Props) {
  const displayDate = diskSnapshotAt ? formatDateTime(diskSnapshotAt) : "Nunca";

  const volumes = useMemo(() => {
    if (!Array.isArray(diskSnapshot)) return [];

    return diskSnapshot.map((disk) => {
      // Support new Agent struct and legacy structs
      const letter = (disk.letter as string) || (disk.name as string) || (disk.volume as string) || "Desconhecido";
      const label = (disk.label as string) || "";
      const name = label ? `${letter}:\\ (${label})` : `${letter}:\\`;
      
      const fileSystem = (disk.fsType as string) || (disk.fileSystem as string) || "Desconhecido";
      
      // Values are in MB in the new struct, bytes in the old one
      let totalMb = Number(disk.totalMb || 0);
      let freeMb = Number(disk.freeMb || 0);
      let usedMb = Number(disk.usedMb || 0);
      let usedPercent = Number(disk.usedPct || 0);

      // Legacy fallback
      if (totalMb === 0 && (disk.size || disk.totalSpace)) {
        const totalBytes = Number(disk.size || disk.Size || disk.totalSpace || 0);
        const freeBytes = Number(disk.freeSpace || disk.FreeSpace || 0);
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        
        totalMb = totalBytes / (1024 * 1024);
        freeMb = freeBytes / (1024 * 1024);
        usedMb = usedBytes / (1024 * 1024);
        usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
      }

      return {
        id: name,
        name: name.trim(),
        fileSystem: fileSystem.trim(),
        totalMb,
        freeMb,
        usedMb,
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
                          {formatMb(vol.totalMb)}
                        </td>
                        <td className="p-4 text-right hidden md:table-cell font-mono text-muted-foreground">
                          {formatMb(vol.freeMb)}
                        </td>
                        <td className="p-4 text-right w-48">
                          <div className="flex items-center justify-end gap-3">
                            <span className="font-mono text-xs text-muted-foreground min-w-[3ch] text-right">
                              {Math.round(vol.usedPercent)}%
                            </span>
                            <div className="h-2 w-24 bg-muted overflow-hidden rounded-full flex-shrink-0">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, vol.usedPercent))}%` }}
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
            <div className="p-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/50">
              <Info className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Nenhuma partição ou volume foi reportado pelo agente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
