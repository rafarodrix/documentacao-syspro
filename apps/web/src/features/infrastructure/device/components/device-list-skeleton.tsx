"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@dosc-syspro/ui";

export function DeviceListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Dispositivo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Conectividade</TableHead>
            <TableHead>Saúde</TableHead>
            <TableHead>Capacidades</TableHead>
            <TableHead className="pr-4 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell className="pl-4 py-3">
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-28 animate-pulse rounded bg-muted/70" />
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell className="py-3">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell className="py-3">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell className="py-3">
                <div className="flex gap-1.5">
                  <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
                </div>
              </TableCell>
              <TableCell className="py-3 pr-4">
                <div className="ml-auto h-8 w-24 animate-pulse rounded bg-muted" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
