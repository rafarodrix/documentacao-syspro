"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Building2, Code2, Headphones, SearchX } from "lucide-react";
import { formatDateSafe } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TicketListItem, TicketSortBy, TicketSortOrder } from "./ticket-view.types";
import type { TicketStatusGroup } from "@dosc-syspro/core";
import { StatusBadge, PriorityBadge } from "./ticket-badges";
import { humanizeModuleHierarchyValue } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";

interface TicketsTableProps {
  tickets: TicketListItem[];
  isAdmin: boolean;
  statusGroup: TicketStatusGroup;
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
  onSortChange: (sortBy: TicketSortBy, sortOrder: TicketSortOrder) => void;
}

export function TicketsTable({ tickets, isAdmin, statusGroup, sortBy, sortOrder, onSortChange }: TicketsTableProps) {
  const router = useRouter();
  const ticketSettings = useTicketModuleSettings();
  const isClosedView = statusGroup === "closed";
  const isOpenView = statusGroup === "open";
  const emptyStateColSpan = isAdmin
    ? isClosedView || isOpenView ? 8 : 9
    : isClosedView || isOpenView ? 7 : 8;

  return (
    <Card className="overflow-hidden border-border/60 bg-card shadow-sm animate-in fade-in duration-700">
      <div className="md:hidden divide-y divide-border/60">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm font-medium text-foreground">Nenhum chamado encontrado</p>
            <p className="text-xs mt-1">Tente ajustar os filtros ou busque por outro termo.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="p-4 space-y-3 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => router.push(`/portal/tickets/${ticket.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{ticket.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    #{ticket.number} - {ticket.group}
                  </p>
                </div>
                {!isClosedView && !isOpenView && <StatusBadge status={ticket.statusLabel} rawStatus={ticket.status} />}
              </div>
              {isAdmin && <p className="text-xs text-muted-foreground truncate">{ticket.customer}</p>}
              <div className="flex items-center gap-2">
                <TeamBadge team={ticket.team} />
                {ticket.category ? (
                  <span className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {resolveCategoryLabel(ticketSettings.categories, ticket.category)}
                  </span>
                ) : null}
                <span className="text-[11px] text-muted-foreground ml-auto">{formatDateSafe(ticket.updatedAt)}</span>
              </div>
              {isClosedView && ticket.resolvedByName ? (
                <p className="text-[11px] text-muted-foreground">Resolvido por {ticket.resolvedByName}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild className="ml-auto">
                  <Link href={`/portal/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()}>Abrir</Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <TableHead className="w-28 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ticket</TableHead>
              <TableHead className="min-w-90 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <SortButton label="Assunto" active={sortBy === "subject"} direction={sortOrder} onClick={() => toggleSort("subject", sortBy, sortOrder, onSortChange)} />
              </TableHead>
              {isAdmin && <TableHead className="min-w-56 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><SortButton label="Cliente" active={sortBy === "customer"} direction={sortOrder} onClick={() => toggleSort("customer", sortBy, sortOrder, onSortChange)} /></TableHead>}
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Categoria</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Equipe</TableHead>
              {!isClosedView && !isOpenView && <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>}
              {!isClosedView && <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prioridade</TableHead>}
              {isClosedView && <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resolvido por</TableHead>}
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><SortButton label={isClosedView ? "Resolvido em" : "Atualizacao"} active={sortBy === "updatedAt"} direction={sortOrder} onClick={() => toggleSort("updatedAt", sortBy, sortOrder, onSortChange)} /></TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <EmptyState colSpan={emptyStateColSpan} />
            ) : (
              tickets.map((ticket, index) => (
                <TableRow
                  key={ticket.id}
                  className="group/row cursor-pointer border-border/50 transition-colors hover:bg-muted/30"
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => router.push(`/portal/tickets/${ticket.id}`)}
                >
                  <TableCell className="py-3">
                    <span className="rounded-md border border-border/50 bg-muted/30 px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground">
                      #{ticket.number}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="max-w-96 truncate text-sm font-medium text-foreground">{ticket.title}</span>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {humanizeModuleHierarchyValue(ticket.module) || ticket.group}
                      </span>
                    </div>
                  </TableCell>

                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60 transition-colors group-hover/row:text-primary">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="max-w-52 truncate text-sm">{ticket.customer}</span>
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {resolveCategoryLabel(ticketSettings.categories, ticket.category)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TeamBadge team={ticket.team} />
                  </TableCell>
                  {!isClosedView && !isOpenView && (
                    <TableCell>
                      <StatusBadge status={ticket.statusLabel} rawStatus={ticket.status} />
                    </TableCell>
                  )}
                  {!isClosedView && (
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                  )}
                  {isClosedView && (
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {ticket.resolvedByName || "Nao informado"}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                    {formatDateSafe(isClosedView ? ticket.resolvedAt || ticket.updatedAt : ticket.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 hover:bg-primary/10 hover:text-primary">
                        <Link href={`/portal/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()}>
                          <span className="hidden sm:inline mr-1 text-xs font-medium">Abrir</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function resolveCategoryLabel(
  categories: Array<{ value: string; label: string }>,
  category?: string | null,
) {
  const normalized = (category || "").trim();
  if (!normalized) return "Nao definida";
  const configured = categories.find((item) => item.value.toLowerCase() === normalized.toLowerCase());
  return configured?.label || humanizeModuleHierarchyValue(normalized) || normalized;
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: TicketSortOrder;
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
    >
      <span>{label}</span>
      <Icon className="h-3 w-3" />
    </button>
  );
}

function toggleSort(
  column: TicketSortBy,
  currentSortBy: TicketSortBy,
  currentSortOrder: TicketSortOrder,
  onSortChange: (sortBy: TicketSortBy, sortOrder: TicketSortOrder) => void,
) {
  if (currentSortBy === column) {
    onSortChange(column, currentSortOrder === "asc" ? "desc" : "asc");
    return;
  }

  onSortChange(column, column === "updatedAt" ? "desc" : "asc");
}

function TeamBadge({ team }: { team?: TicketListItem["team"] }) {
  if (team === "DESENVOLVIMENTO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
        <Code2 className="h-3 w-3" /> Dev
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
      <Headphones className="h-3 w-3" /> Suporte
    </span>
  );
}

function EmptyState({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-64 text-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
            <SearchX className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">Nenhum chamado encontrado</p>
            <p className="text-sm mt-1 opacity-70">Tente ajustar os filtros ou busque por outro termo.</p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
