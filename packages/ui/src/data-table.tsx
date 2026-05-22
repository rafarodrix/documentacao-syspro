/**
 * @dosc-syspro/ui — DataTable
 * Genérico, responsivo, integrado ao design system glassmorphic.
 */
import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Card } from "./card";
import { cn } from "./utils";
import { Loader2 } from "lucide-react";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Controle de Ordenação Externo (Server-side / trpc)
  sorting?: {
    sortBy: string;
    sortOrder: "asc" | "desc";
    onSortChange: (sortBy: any, sortOrder: "asc" | "desc") => void;
  };

  // Layout & Styling
  flexible?: boolean;
  minWidthClassName?: string;
  className?: string;
  cardClassName?: string;
  rowClassName?: string | ((row: TData) => string);

  // Ações & Estados
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  loadingLabel?: string;

  // Customizações de Estado Vazio
  emptyState?: {
    title: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
  };

  // Renderização responsiva mobile
  renderMobileItem?: (row: TData) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  flexible = false,
  minWidthClassName,
  className,
  cardClassName,
  rowClassName,
  onRowClick,
  loading = false,
  loadingLabel = "Carregando...",
  emptyState,
  renderMobileItem,
}: DataTableProps<TData, TValue>) {
  // Traduz a ordenação controlada para o estado do TanStack
  const tableSorting = React.useMemo<SortingState | undefined>(() => {
    if (!sorting) return undefined;
    return [{ id: sorting.sortBy, desc: sorting.sortOrder === "desc" }];
  }, [sorting]);

  const handleSortingChange = React.useCallback(
    (updater: any) => {
      if (!sorting) return;
      const current = [{ id: sorting.sortBy, desc: sorting.sortOrder === "desc" }];
      const nextState = typeof updater === "function" ? updater(current) : updater;
      const first = nextState[0];
      if (first) {
        sorting.onSortChange(first.id, first.desc ? "desc" : "asc");
      }
    },
    [sorting]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: tableSorting,
    },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // A ordenação é controlada externamente no portal
  });

  const hasMobileLayout = !!renderMobileItem;
  const colSpan = columns.length;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 bg-card animate-in fade-in duration-700",
        cardClassName
      )}
    >
      {/* Visualização Mobile (Card Grid) */}
      {hasMobileLayout && (
        <div className="md:hidden divide-y divide-border/60">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground p-6">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{loadingLabel}</span>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center h-48">
              {emptyState?.icon && (
                <emptyState.icon className="h-8 w-8 text-muted-foreground/60 mb-2" />
              )}
              <h3 className="text-sm font-semibold">{emptyState?.title || "Nenhum registro"}</h3>
              {emptyState?.description && (
                <p className="text-xs text-muted-foreground mt-1">{emptyState.description}</p>
              )}
            </div>
          ) : (
            data.map((row, idx) => (
              <div key={idx} className="transition-colors hover:bg-muted/10">
                {renderMobileItem(row)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Visualização Desktop (Table Layout responsivo) */}
      <div
        className={cn(
          "w-full min-w-0",
          flexible ? "" : "overflow-x-auto",
          hasMobileLayout ? "hidden md:block" : "",
          className
        )}
      >
        <div className={cn(flexible ? "w-full" : "min-w-max", minWidthClassName)}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/20 backdrop-blur border-b border-border/60">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/60">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as { className?: string } | undefined;
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 py-3",
                          meta?.className
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center h-32">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>{loadingLabel}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="text-center h-64">
                    <div className="flex flex-col items-center justify-center text-center p-6">
                      {emptyState?.icon && (
                        <emptyState.icon className="h-10 w-10 text-muted-foreground/60 mb-3" />
                      )}
                      <h3 className="text-sm font-semibold">{emptyState?.title || "Nenhum chamado encontrado"}</h3>
                      {emptyState?.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {emptyState.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row, index) => {
                  const resolvedRowClassName =
                    typeof rowClassName === "function"
                      ? rowClassName(row.original)
                      : rowClassName;

                  return (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "group/row border-border/50 transition-colors hover:bg-muted/10",
                        onRowClick ? "cursor-pointer" : "",
                        resolvedRowClassName
                      )}
                      style={{ animationDelay: `${index * 40}ms` } as React.CSSProperties}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn("px-3 py-3.5", meta?.className)}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
