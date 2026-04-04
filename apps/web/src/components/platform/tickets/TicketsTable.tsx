"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Building2, Loader2, SearchX } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateSafe } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TicketListItem, TicketPriorityLevel } from "./types";
import { getTicketStatusGroup } from "@dosc-syspro/core";
import type { TicketMutationResponse } from "@/features/tickets/domain/model";

interface TicketsTableProps {
    tickets: TicketListItem[];
    isAdmin: boolean;
}

export function TicketsTable({ tickets, isAdmin }: TicketsTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const runQuickAction = (ticketId: number, action: "assume" | "priority_high" | "macro_followup") => {
        const actionKey = `${ticketId}:${action}`;
        setLoadingAction(actionKey);

        startTransition(async () => {
            try {
                const response = await fetch(`/api/platform/tickets/${ticketId}/quick-actions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action }),
                });
                const json = (await response.json()) as TicketMutationResponse;

                if (!response.ok || !json.success) {
                    toast.error(json.success ? "Falha ao executar acao rapida." : json.error);
                    return;
                }

                const label =
                    action === "assume"
                        ? "Ticket assumido com sucesso."
                        : action === "priority_high"
                          ? "Prioridade alterada para alta."
                          : "Macro aplicada com sucesso.";

                toast.success(label);
                router.refresh();
            } catch {
                toast.error("Erro de conexao ao executar acao rapida.");
            } finally {
                setLoadingAction(null);
            }
        });
    };

    return (
        <Card className="group relative overflow-hidden border-border/60 shadow-lg bg-background/50 backdrop-blur-xl animate-in fade-in duration-700">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="md:hidden divide-y">
                {tickets.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <p className="text-sm font-medium text-foreground">Nenhum chamado encontrado</p>
                        <p className="text-xs mt-1">Tente ajustar os filtros ou busque por outro termo.</p>
                    </div>
                ) : (
                    tickets.map((ticket) => (
                        <div key={ticket.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{ticket.title}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">#{ticket.number} - {ticket.group}</p>
                                </div>
                                <StatusBadge status={ticket.statusLabel} rawStatus={ticket.status} />
                            </div>
                            {isAdmin && (
                                <p className="text-xs text-muted-foreground truncate">{ticket.customer}</p>
                            )}
                            <div className="flex items-center gap-2">
                                <PriorityBadge priority={ticket.priority} />
                                <SlaBadge ticket={ticket} />
                                <span className="text-[11px] text-muted-foreground ml-auto">{formatDateSafe(ticket.updatedAt)}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {isAdmin && (
                                    <>
                                        <QuickButton
                                            label="Assumir"
                                            pending={isPending && loadingAction === `${ticket.id}:assume`}
                                            onClick={() => runQuickAction(ticket.id, "assume")}
                                        />
                                        <QuickButton
                                            label="Alta"
                                            pending={isPending && loadingAction === `${ticket.id}:priority_high`}
                                            onClick={() => runQuickAction(ticket.id, "priority_high")}
                                        />
                                        <QuickButton
                                            label="Macro"
                                            pending={isPending && loadingAction === `${ticket.id}:macro_followup`}
                                            onClick={() => runQuickAction(ticket.id, "macro_followup")}
                                        />
                                    </>
                                )}
                                <Button variant="outline" size="sm" asChild className="ml-auto">
                                    <Link href={`/portal/chamados/${ticket.id}`}>Abrir</Link>
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="hidden md:block">
            <Table>
                <TableHeader className="bg-muted/20">
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                        <TableHead className="w-25 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Ticket</TableHead>
                        <TableHead className="min-w-70 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Assunto</TableHead>
                        {isAdmin && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Cliente</TableHead>}
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Prioridade</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">SLA</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Atualizacao</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Acoes</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets.length === 0 ? (
                        <EmptyState isAdmin={isAdmin} />
                    ) : (
                        tickets.map((ticket, index) => (
                            <TableRow
                                key={ticket.id}
                                className="group/row hover:bg-muted/40 transition-all duration-300 border-border/40"
                                style={{ animationDelay: `${index * 40}ms` }}
                            >
                                <TableCell className="py-4">
                                    <span className="rounded-md border border-border/40 bg-muted/30 px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground">
                                        #{ticket.number}
                                    </span>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-foreground truncate max-w-70 sm:max-w-105">{ticket.title}</span>
                                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{ticket.group}</span>
                                    </div>
                                </TableCell>

                                {isAdmin && (
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-all group-hover/row:bg-primary/20 group-hover/row:scale-105">
                                                <Building2 className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm truncate max-w-45">{ticket.customer}</span>
                                        </div>
                                    </TableCell>
                                )}

                                <TableCell>
                                    <StatusBadge status={ticket.statusLabel} rawStatus={ticket.status} />
                                </TableCell>
                                <TableCell>
                                    <PriorityBadge priority={ticket.priority} />
                                </TableCell>
                                <TableCell>
                                    <SlaBadge ticket={ticket} />
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                    {formatDateSafe(ticket.updatedAt)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {isAdmin && (
                                            <>
                                                <QuickButton
                                                    label="Assumir"
                                                    pending={isPending && loadingAction === `${ticket.id}:assume`}
                                                    onClick={() => runQuickAction(ticket.id, "assume")}
                                                />
                                                <QuickButton
                                                    label="Alta"
                                                    pending={isPending && loadingAction === `${ticket.id}:priority_high`}
                                                    onClick={() => runQuickAction(ticket.id, "priority_high")}
                                                />
                                                <QuickButton
                                                    label="Macro"
                                                    pending={isPending && loadingAction === `${ticket.id}:macro_followup`}
                                                    onClick={() => runQuickAction(ticket.id, "macro_followup")}
                                                />
                                            </>
                                        )}
                                        <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 hover:text-primary h-8 px-3 rounded-full">
                                            <Link href={`/portal/chamados/${ticket.id}`}>
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

function QuickButton({ label, pending, onClick }: { label: string; pending: boolean; onClick: () => void }) {
    return (
        <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
        </Button>
    );
}

const STATUS_STYLES = {
    open: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    closed: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
} as const;

function StatusBadge({ status, rawStatus }: { status?: string | null; rawStatus?: string | null }) {
    const resolvedStatus = typeof status === "string" ? status : "";
    const resolvedRawStatus = typeof rawStatus === "string" ? rawStatus : "";
    const category = getTicketStatusGroup(resolvedRawStatus || resolvedStatus);
    const style = STATUS_STYLES[category];
    const label = (resolvedStatus || resolvedRawStatus || "Sem status").replace(/^\d+\.\s*/, "");
    return (
        <Badge variant="outline" className={`border ${style} font-medium px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap`}>
            {label}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: TicketPriorityLevel }) {
    if (priority === 3) return <Badge variant="destructive" className="text-[10px] px-2 rounded-full">Alta</Badge>;
    if (priority === 1) return <Badge variant="secondary" className="text-[10px] px-2 rounded-full bg-muted text-muted-foreground">Baixa</Badge>;
    return <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground rounded-full">Normal</Badge>;
}

function SlaBadge({ ticket }: { ticket: TicketListItem }) {
    if (ticket.slaBreached) return <Badge variant="destructive" className="text-[10px] px-2 rounded-full">SLA estourado</Badge>;
    if (ticket.slaWarning) {
        const suffix = typeof ticket.minutesToBreach === "number" && ticket.minutesToBreach > 0 ? ` (${ticket.minutesToBreach} min)` : "";
        return <Badge variant="outline" className="text-[10px] px-2 rounded-full border-amber-500/50 text-amber-400">SLA alerta{suffix}</Badge>;
    }
    if (ticket.firstResponseAt) return <Badge variant="secondary" className="text-[10px] px-2 rounded-full">Respondido</Badge>;
    return <Badge variant="outline" className="text-[10px] px-2 rounded-full">No prazo</Badge>;
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
    return (
        <TableRow>
            <TableCell colSpan={isAdmin ? 8 : 7} className="h-64 text-center">
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
