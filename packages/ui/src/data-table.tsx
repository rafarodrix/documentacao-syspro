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
  getSortedRowModel,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Card } from "./card";
import { cn } from "./utils";
import { Loader2, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

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
  onRowDoubleClick?: (row: TData) => void;
  loading?: boolean;
  loadingLabel?: string;

  // Seleção de Linhas (TanStack)
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  // Visibilidade de Colunas (TanStack)
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

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
  onRowDoubleClick,
  loading = false,
  loadingLabel = "Carregando...",
  emptyState,
  renderMobileItem,
  rowSelection,
  onRowSelectionChange,
  columnVisibility,
  onColumnVisibilityChange,
}: DataTableProps<TData, TValue>) {
  // Estado local para ordenação in-memory
  const [localSorting, setLocalSorting] = React.useState<SortingState>([]);

  // Traduz a ordenação controlada para o estado do TanStack
  const tableSorting = React.useMemo<SortingState>(() => {
    if (!sorting) return localSorting;
    return [{ id: sorting.sortBy, desc: sorting.sortOrder === "desc" }];
  }, [sorting, localSorting]);

  const handleSortingChange = React.useCallback(
    (updater: any) => {
      if (!sorting) {
        setLocalSorting(updater);
        return;
      }
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
      rowSelection,
      columnVisibility,
    },
    onSortingChange: handleSortingChange,
    onRowSelectionChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: !!sorting, // A ordenação é controlada externamente apenas quando prop sorting existe
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
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();

                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 py-3",
                          canSort && "cursor-pointer select-none hover:bg-muted/30 focus-visible:outline-none transition-colors group/head",
                          meta?.className
                        )}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-1.5">
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            {canSort && (
                              <span className="shrink-0 text-muted-foreground/50 transition-colors group-hover/head:text-foreground">
                                {sortDirection === "desc" ? (
                                  <ArrowDown className="h-3.5 w-3.5 text-primary animate-in fade-in zoom-in duration-200" />
                                ) : sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-primary animate-in fade-in zoom-in duration-200" />
                                ) : (
                                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 group-hover/head:opacity-100" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
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
                        (onRowClick || onRowDoubleClick) ? "cursor-pointer" : "",
                        resolvedRowClassName
                      )}
                      style={{ animationDelay: `${index * 40}ms` } as React.CSSProperties}
                      onClick={() => onRowClick?.(row.original)}
                      onDoubleClick={() => onRowDoubleClick?.(row.original)}
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
