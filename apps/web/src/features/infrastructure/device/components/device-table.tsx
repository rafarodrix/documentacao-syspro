"use client";

import type { DeviceListItem, DeviceListPagination } from "@dosc-syspro/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dosc-syspro/ui";
import { DeviceTableRow } from "./device-table-row";

type DeviceTableProps = {
  items: DeviceListItem[];
  pagination: DeviceListPagination;
  summaryLabel?: string;
  isAdmin?: boolean;
  canManage?: boolean;
  sort?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange?: (sort: string) => void;
  onConnect?: (item: DeviceListItem) => void;
  onCopyRustDeskId?: (id: string | null) => void;
  onLinkCompany?: (item: DeviceListItem) => void;
  onArchive?: (item: DeviceListItem) => void;
};

export function DeviceTable({
  items,
  pagination,
  summaryLabel,
  isAdmin = false,
  canManage = true,
  sort,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onConnect,
  onCopyRustDeskId,
  onLinkCompany,
  onArchive,
}: DeviceTableProps) {
  const { page, pageSize, totalItems, totalPages } = pagination;
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  const handleToggleSort = (field: string) => {
    if (!onSortChange) return;
    const [currentField, currentDir] = (sort ?? "").split(":");
    if (currentField === field) {
      onSortChange(currentDir === "asc" ? `${field}:desc` : `${field}:asc`);
    } else {
      onSortChange(`${field}:asc`);
    }
  };

  const renderSortIndicator = (field: string) => {
    const [currentField, currentDir] = (sort ?? "").split(":");
    if (currentField !== field) return <span className="ml-1 text-muted-foreground/50">↕</span>;
    return <span className="ml-1 text-primary font-bold">{currentDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="py-2.5 pl-4 pr-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[22%] cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleToggleSort("displayName")}
                >
                  Dispositivo {renderSortIndicator("displayName")}
                </TableHead>
                <TableHead
                  className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[28%] cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleToggleSort("company")}
                >
                  Empresa {renderSortIndicator("company")}
                </TableHead>
                <TableHead
                  className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[16%] cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleToggleSort("connectivity")}
                >
                  Conectividade {renderSortIndicator("connectivity")}
                </TableHead>
                <TableHead
                  className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[16%] cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleToggleSort("health")}
                >
                  Saúde {renderSortIndicator("health")}
                </TableHead>
                <TableHead className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[10%]">
                  Capacidades
                </TableHead>
                <TableHead className="py-2.5 pl-3 pr-4 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[8%]">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40">
              {items.map((item) => (
                <DeviceTableRow
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  canManage={canManage}
                  onConnect={onConnect}
                  onCopyRustDeskId={onCopyRustDeskId}
                  onLinkCompany={onLinkCompany}
                  onArchive={onArchive}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer / Compact Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 bg-card px-4 py-2.5 text-xs text-muted-foreground">
          <div>
            {summaryLabel ?? (
              <span>
                {startItem}–{endItem} de {totalItems}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">Por página:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => onPageSizeChange(Number(val))}
              >
                <SelectTrigger className="h-7 w-16 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  title="Página anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] font-medium px-1">
                  {page}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  title="Próxima página"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
