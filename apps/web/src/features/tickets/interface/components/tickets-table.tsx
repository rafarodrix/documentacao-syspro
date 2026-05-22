"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Building2, Code2, Headphones, SearchX } from "lucide-react";
import {
  EmptyState,
  PortalTable,
  PortalTableBody,
  PortalTableEmptyRow,
  PortalTableHead,
  PortalTableHeader,
  PortalTableViewport,
} from "@/components/patterns";
import { formatRelativeDate, formatAbsoluteDate } from "@/lib/utils";
import { TableCell, TableRow, Button, Card, Tooltip, TooltipContent, TooltipTrigger } from "@dosc-syspro/ui";
import type { TicketListItem, TicketSortBy, TicketSortOrder } from "./ticket-view.types";
import type { TicketStatusGroup } from "@dosc-syspro/core";
import { StatusBadge, PriorityBadge } from "./ticket-badges";
import { humanizeModuleHierarchyValue } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";

interface TicketsTableProps {
  tickets: TicketListItem[];
  canManageTickets: boolean;
  statusGroup: TicketStatusGroup;
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
  onSortChange: (sortBy: TicketSortBy, sortOrder: TicketSortOrder) => void;
}

export function TicketsTable({ tickets, canManageTickets, statusGroup, sortBy, sortOrder, onSortChange }: TicketsTableProps) {
  const router = useRouter();
  const ticketSettings = useTicketModuleSettings();
  const isClosedView = statusGroup === "closed";
  const isOpenView = statusGroup === "open";
  const emptyStateColSpan = canManageTickets
    ? isClosedView || isOpenView ? 8 : 9
    : isClosedView || isOpenView ? 7 : 8;

  return (
    <Card className="overflow-hidden border-border/60 bg-card animate-in fade-in duration-700">
      <div className="md:hidden divide-y divide-border/60">
        {tickets.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nenhum chamado encontrado"
            description="Tente ajustar os filtros ou busque por outro termo."
            compact
          />
        ) : (
          tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="cursor-pointer space-y-3 p-4 transition-colors hover:bg-muted/10"
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
              {canManageTickets && (
                <div className="flex flex-col gap-0">
                  <p className="text-xs text-foreground truncate">{ticket.companyName || ticket.customer}</p>
                  {ticket.companyName && ticket.contactName && (
                    <p className="text-[11px] text-muted-foreground truncate">{ticket.contactName}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <TeamBadge team={ticket.team} />
                {ticket.category ? (
                  <span className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {resolveCategoryLabel(ticketSettings.categories, ticket.category)}
                  </span>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[11px] text-muted-foreground ml-auto cursor-default">
                      {formatRelativeDate(ticket.updatedAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-mono text-xs">
                    {formatAbsoluteDate(ticket.updatedAt)}
                  </TooltipContent>
                </Tooltip>
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

      <PortalTableViewport
        className="hidden md:block"
        flexible={true}
      >
        <PortalTable>
          <PortalTableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <PortalTableHead className="w-28 px-3 py-3">Ticket</PortalTableHead>
              <PortalTableHead className="min-w-90 px-3 py-3">
                <SortButton label="Assunto" active={sortBy === "subject"} direction={sortOrder} onClick={() => toggleSort("subject", sortBy, sortOrder, onSortChange)} />
              </PortalTableHead>
              {canManageTickets && <PortalTableHead className="min-w-56 px-3 py-3"><SortButton label="Cliente" active={sortBy === "customer"} direction={sortOrder} onClick={() => toggleSort("customer", sortBy, sortOrder, onSortChange)} /></PortalTableHead>}
              <PortalTableHead className="px-3 py-3 hidden xl:table-cell">Categoria</PortalTableHead>
              <PortalTableHead className="px-3 py-3 hidden lg:table-cell">Equipe</PortalTableHead>
              {!isClosedView && !isOpenView && <PortalTableHead className="px-3 py-3">Status</PortalTableHead>}
              {!isClosedView && <PortalTableHead className="px-3 py-3 hidden xl:table-cell">Prioridade</PortalTableHead>}
              {isClosedView && <PortalTableHead className="px-3 py-3 hidden xl:table-cell">Resolvido por</PortalTableHead>}
              <PortalTableHead className="px-3 py-3 hidden lg:table-cell"><SortButton label={isClosedView ? "Resolvido em" : "Atualizacao"} active={sortBy === "updatedAt"} direction={sortOrder} onClick={() => toggleSort("updatedAt", sortBy, sortOrder, onSortChange)} /></PortalTableHead>
              <PortalTableHead className="px-3 py-3 text-right">Acoes</PortalTableHead>
            </TableRow>
          </PortalTableHeader>
          <PortalTableBody>
            {tickets.length === 0 ? (
              <PortalTableEmptyRow
                colSpan={emptyStateColSpan}
                icon={SearchX}
                title="Nenhum chamado encontrado"
                description="Tente ajustar os filtros ou busque por outro termo."
              />
            ) : (
              tickets.map((ticket, index) => (
                <TableRow
                  key={ticket.id}
                  className="group/row cursor-pointer border-border/50 transition-colors hover:bg-muted/10"
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => router.push(`/portal/tickets/${ticket.id}`)}
                >
                  <TableCell className="px-3 py-3.5">
                    <span className="rounded-md border border-border/50 bg-background px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground">
                      #{ticket.number}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="max-w-96 truncate text-sm font-medium text-foreground">{ticket.title}</span>
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {humanizeModuleHierarchyValue(ticket.module) || ticket.group}
                      </span>
                    </div>
                  </TableCell>

                  {canManageTickets && (
                    <TableCell className="px-3 py-3.5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="max-w-52 truncate text-sm text-foreground">
                            {ticket.companyName || ticket.customer}
                          </span>
                          {ticket.companyName && ticket.contactName && (
                            <span className="max-w-52 truncate text-[11px] text-muted-foreground">
                              {ticket.contactName}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}

                  <TableCell className="px-3 py-3.5 hidden xl:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {resolveCategoryLabel(ticketSettings.categories, ticket.category)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-3.5 hidden lg:table-cell">
                    <TeamBadge team={ticket.team} />
                  </TableCell>
                  {!isClosedView && !isOpenView && (
                    <TableCell className="px-3 py-3.5">
                      <StatusBadge status={ticket.statusLabel} rawStatus={ticket.status} />
                    </TableCell>
                  )}
                  {!isClosedView && (
                    <TableCell className="px-3 py-3.5 hidden xl:table-cell">
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                  )}
                  {isClosedView && (
                    <TableCell className="px-3 py-3.5 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {ticket.resolvedByName || "Nao informado"}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="px-3 py-3.5 text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">
                          {formatRelativeDate(isClosedView ? ticket.resolvedAt || ticket.updatedAt : ticket.updatedAt)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="font-mono text-xs">
                        {formatAbsoluteDate(isClosedView ? ticket.resolvedAt || ticket.updatedAt : ticket.updatedAt)}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="px-3 py-3.5 text-right">
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
          </PortalTableBody>
        </PortalTable>
      </PortalTableViewport>
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
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-semibold text-foreground">
        <Code2 className="h-3 w-3" /> Dev
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-semibold text-foreground">
      <Headphones className="h-3 w-3" /> Suporte
    </span>
  );
}
