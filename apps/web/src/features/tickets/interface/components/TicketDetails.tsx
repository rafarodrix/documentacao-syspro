"use client";

import { useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Clock3,
    ExternalLink,
    Flag,
    Hash,
    Loader2,
    MoreHorizontal,
    Sparkles,
    Timer,
    UserRound,
    Zap,
} from "lucide-react";
import type { TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import { assignTicketToMeAction, triageTicketAction, unassignTicketToMeAction, updateTicketStatusAction } from "@/features/tickets/application/ticket-actions";
import { TicketChat } from "@/features/tickets/interface/components/TicketChat";
import { TicketFinalizeDialog } from "@/features/tickets/interface/components/TicketFinalizeDialog";
import { TransferTicketDialog } from "@/features/tickets/interface/components/TransferTicketDialog";
import { useTicketHotkeys } from "@/features/tickets/interface/hooks/use-ticket-hotkeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TicketArticleItem, TicketDetailsItem } from "./types";

interface TicketDetailsProps {
    ticket?: TicketDetailsItem;
    articles: TicketArticleItem[];
    isAdmin: boolean;
    error?: string;
    currentUserId?: string;
}

export function TicketDetails({ ticket, articles, isAdmin, error, currentUserId }: TicketDetailsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [finalizeOpen, setFinalizeOpen] = useState(false);
    const backUrl = "/portal/tickets";
    const isClosedTicket = ticket ? isTicketClosed(ticket.status) : false;
    const currentTicketStatus = ticket ? normalizeStatusValue(ticket.status) : null;

    const assignToMe = () => {
        if (!ticket) return;
        startTransition(async () => {
            const res = await assignTicketToMeAction(String(ticket.id));
            if (res.success) toast.success("Ticket atribuido a voce");
            else toast.error(res.error || "Erro ao atribuir");
            router.refresh();
        });
    };

    const unassignFromMe = () => {
        if (!ticket) return;
        startTransition(async () => {
            const res = await unassignTicketToMeAction(String(ticket.id));
            if (res.success) toast.success("Ticket liberado com sucesso.");
            else toast.error(res.error || "Erro ao liberar");
            router.refresh();
        });
    };

    const startTriage = () => {
        if (!ticket) return;
        startTransition(async () => {
            const res = await triageTicketAction(String(ticket.id), { priority: "NORMAL" });
            if (res.success) toast.success("Triagem iniciada");
            else toast.error(res.error || "Erro na triagem");
            router.refresh();
        });
    };

    const changeStatus = (status: TicketModuleStatus) => {
        if (!ticket) return;
        if (status === "RESOLVED") {
            setFinalizeOpen(true);
            return;
        }

        startTransition(async () => {
            const res = await updateTicketStatusAction(String(ticket.id), status);
            if (res.success) toast.success("Estagio atualizado.");
            else toast.error(res.error || "Erro ao atualizar estagio");
            router.refresh();
        });
    };

    useTicketHotkeys({
        onAssignToMe: () => {
            if (isAdmin && ticket && !ticket.ownerId && !isClosedTicket) assignToMe();
        },
        onChangeStatus: () => document.getElementById("transfer-ticket-btn")?.click(),
        onReply: () => document.getElementById("ticket-reply-input")?.focus(),
    });

    if (error || !ticket) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-foreground">Nao foi possivel carregar o chamado</h1>
                <p className="mb-6 max-w-md text-muted-foreground">{error || "O ticket pode nao existir ou voce nao tem permissao."}</p>
                <Button variant="outline" asChild className="gap-2">
                    <Link href={backUrl}>
                        <ArrowLeft className="h-4 w-4" /> Voltar para lista
                    </Link>
                </Button>
            </div>
        );
    }

    const currentUserOwnsTicket = ticket.ownerId && String(ticket.ownerId) === String(currentUserId);
    const timelineArticles = withTechnicalResourceArticles(articles || [], ticket);

    return (
        <div className="mx-auto max-w-[1440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-4 flex items-center gap-3 px-4 md:px-0">
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 shrink-0 rounded-full hover:bg-muted/80">
                    <Link href={backUrl}>
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </Button>
                <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <Link href={backUrl} className="transition-colors hover:text-foreground">Chamados</Link>
                    <span>/</span>
                    <Badge variant="secondary" className="gap-1 border-border/50 bg-muted/50 font-mono text-xs">
                        <Hash className="h-3 w-3" />
                        {ticket.number}
                    </Badge>
                </div>
            </div>

            <div className="mb-6 px-4 md:px-0">
                <h1 className="max-w-full break-words text-xl font-bold leading-snug tracking-tight text-foreground md:text-2xl">{ticket.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> Criado em {ticket.createdAt}
                    </span>
                    {ticket.updatedAt && (
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Atualizado em {new Date(ticket.updatedAt).toLocaleDateString("pt-BR")}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 px-4 pb-10 md:px-0 lg:grid-cols-12">
                <div className="min-w-0 space-y-6 lg:col-span-8">
                    <TicketChat ticketId={String(ticket.id)} articles={timelineArticles} ticketStatus={ticket.status || ""} />
                </div>

                <aside className="min-w-0 space-y-4 lg:col-span-4">
                    <button
                        className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3 text-sm font-medium lg:hidden"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        type="button"
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary/70" />
                            Detalhes do chamado
                        </span>
                        {sidebarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>

                    <div className={cn("space-y-4", sidebarCollapsed && "hidden lg:block")}>
                        <CustomerContextCard ticket={ticket} />

                        <Card className="relative overflow-hidden border-border/60 bg-card/95">
                            <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                                    Informacoes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <section className="space-y-3">
                                    <SidebarField
                                        label="Estagio atual"
                                        value={
                                            <StatusDropdown
                                                status={ticket.status}
                                                disabled={!isAdmin || isPending}
                                                onChange={changeStatus}
                                            />
                                        }
                                    />
                                    <SidebarField label="Prioridade" value={<PriorityBadge priority={ticket.priority} />} />
                                </section>

                                {isAdmin && (
                                    <>
                                        <Separator />
                                        <section className="space-y-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{isClosedTicket ? "Correcoes de fluxo" : "Acoes de fluxo"}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {currentTicketStatus === "NEW" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1 border-primary/20 bg-primary/5 text-xs text-primary hover:bg-primary/10"
                                                        onClick={startTriage}
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                        Triar
                                                    </Button>
                                                )}
                                                {!ticket.ownerId && !isClosedTicket && (
                                                    <Button size="sm" className="h-8 gap-1 bg-blue-600 text-xs text-white shadow-sm hover:bg-blue-700" onClick={assignToMe} disabled={isPending}>
                                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserRound className="h-3 w-3" />}
                                                        Assumir
                                                    </Button>
                                                )}
                                                {currentUserOwnsTicket && !isClosedTicket && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 gap-1 border-muted-foreground/30 text-xs text-muted-foreground shadow-sm hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={unassignFromMe}
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserRound className="h-3 w-3" />}
                                                        Liberar
                                                    </Button>
                                                )}
                                                <TransferTicketDialog
                                                    ticketId={ticket.id}
                                                    currentTeam={ticket.operations?.currentTeam || undefined}
                                                />
                                                {!isClosedTicket && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuLabel className="text-xs">Mais acoes</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-xs text-emerald-600 focus:text-emerald-700" onSelect={() => setFinalizeOpen(true)}>
                                                                <Flag className="h-3.5 w-3.5" />
                                                                Finalizar ticket
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </section>
                                    </>
                                )}

                                <Separator />
                                <SlaCompact ticket={ticket} isClosedTicket={isClosedTicket} />

                                <Separator />
                                <section className="space-y-3">
                                    <SidebarField label="Responsavel" value={
                                        <span className="flex items-center gap-1.5 text-sm">
                                            <UserRound className="h-3 w-3 text-muted-foreground" />
                                            {ticket.ownerName || (ticket.ownerId ? `#${ticket.ownerId}` : "Nao atribuido")}
                                        </span>
                                    } />
                                    <SidebarField label="1a resposta" value={<DetailDate value={ticket.firstResponseAt} fallback="Pendente" />} />
                                    <SidebarField label="Resolucao" value={<DetailDate value={ticket.resolvedAt} fallback="Pendente" />} />
                                </section>

                                <Separator />
                                <section className="space-y-3">
                                    {ticket.operations?.currentTeam && <SidebarField label="Setor atual" value={<span className="text-xs">{ticket.operations.currentTeam}</span>} />}
                                    {ticket.operations?.module && <SidebarField label="Modulo" value={<span className="text-xs">{ticket.operations.module}</span>} />}
                                    {ticket.operations?.category && <SidebarField label="Categoria" value={<span className="text-xs">{ticket.operations.category}</span>} />}
                                    {ticket.operations?.openedByName && <SidebarField label="Operador" value={<span className="text-xs">{ticket.operations.openedByName}</span>} />}
                                    {ticket.operations?.supportOwnerName && <SidebarField label="Resp. suporte" value={<span className="text-xs">{ticket.operations.supportOwnerName}</span>} />}
                                    {ticket.operations?.developmentOwnerName && <SidebarField label="Resp. desenvolvimento" value={<span className="text-xs">{ticket.operations.developmentOwnerName}</span>} />}
                                    {ticket.resolvedByName && <SidebarField label="Resolvido por" value={<span className="text-xs">{ticket.resolvedByName}</span>} />}
                                    <SidebarField label="Criado em" value={<span className="font-mono text-xs text-muted-foreground">{ticket.createdAt}</span>} />
                                    {ticket.updatedAt && <SidebarField label="Atualizado" value={<span className="font-mono text-xs text-muted-foreground">{new Date(ticket.updatedAt).toLocaleDateString("pt-BR")}</span>} />}
                                </section>
                            </CardContent>
                        </Card>

                        {(ticket.origin?.source || ticket.origin?.contactName || ticket.origin?.contactPhone || ticket.origin?.contactWhatsapp || ticket.origin?.chatwootConversationUrl) && (
                            <Card className="border-border/60 bg-card/95">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                                        Contexto e origem
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    {ticket.origin?.source && (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="px-2 text-[10px] uppercase tracking-wide">
                                                {ticket.origin.source}
                                            </Badge>
                                        </div>
                                    )}
                                    {ticket.origin?.contactName && <SidebarField label="Contato" value={<span className="text-xs">{ticket.origin.contactName}</span>} />}
                                    {ticket.origin?.contactPhone && <SidebarField label="Telefone" value={<span className="font-mono text-xs">{ticket.origin.contactPhone}</span>} />}
                                    {ticket.origin?.contactWhatsapp && <SidebarField label="WhatsApp" value={<span className="font-mono text-xs">{ticket.origin.contactWhatsapp}</span>} />}
                                    {ticket.origin?.chatwootConversationUrl && <ExternalTicketLink href={ticket.origin.chatwootConversationUrl} label="Ver conversa no Chatwoot" />}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </aside>
            </div>

            <TicketFinalizeDialog ticket={ticket} open={finalizeOpen} onOpenChange={setFinalizeOpen} />
        </div>
    );
}

function isTicketClosed(status?: string | null) {
    const normalized = (status || "").toLowerCase();
    return ["resolvido", "fechado", "arquivado", "finalizado"].some((item) => normalized.includes(item));
}

function withTechnicalResourceArticles(articles: TicketArticleItem[], ticket: TicketDetailsItem): TicketArticleItem[] {
    const resources = [
        { id: "database", label: "Base de dados", url: ticket.operations?.databaseUrl },
        { id: "video", label: "Video tecnico", url: ticket.operations?.developmentVideoUrl },
    ].filter((resource): resource is { id: string; label: string; url: string } => Boolean(resource.url));

    if (!resources.length) return articles;

    const synthetic = resources
        .filter((resource) => !articles.some((article) => article.body.includes(resource.url)))
        .map((resource): TicketArticleItem => {
            const safeUrl = escapeHtml(resource.url);
            return {
                id: `technical-resource-${resource.id}`,
                from: "Sistema",
                body: `<p><strong>Recurso tecnico: ${resource.label}</strong></p><p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></p>`,
                createdAt: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("pt-BR") : ticket.createdAt,
                sender: "Agent",
                isInternal: true,
                messageType: "TEXT",
            };
        });

    return synthetic.length ? [...articles, ...synthetic] : articles;
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function SidebarField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <div className="min-w-0 text-right break-words">{value}</div>
        </div>
    );
}

function CustomerContextCard({ ticket }: { ticket: TicketDetailsItem }) {
    const customerName = ticket.companyName || ticket.origin?.contactName || "Cliente nao identificado";
    const href = ticket.companyId ? `/portal/cadastros/empresa/${ticket.companyId}/editar` : null;

    return (
        <Card className="border-border/60 bg-card/95">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</p>
                        {href ? (
                            <Link href={href} target="_blank" className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                                <span className="truncate">{customerName}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </Link>
                        ) : (
                            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{customerName}</p>
                        )}
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">#{ticket.number}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DetailDate({ value, fallback }: { value?: string | null; fallback: string }) {
    if (!value) return <span className="text-xs text-muted-foreground">{fallback}</span>;
    return <span className="font-mono text-xs text-muted-foreground">{new Date(value).toLocaleString("pt-BR")}</span>;
}

const statusOptions: Array<{ value: TicketModuleStatus; label: string }> = [
    { value: "TRIAGE", label: "Triagem" },
    { value: "IN_PROGRESS", label: "Em andamento" },
    { value: "TESTING", label: "Em teste" },
    { value: "WAITING_CUSTOMER", label: "Pendente cliente" },
    { value: "WAITING_INTERNAL", label: "Aguardando interno" },
    { value: "RESOLVED", label: "Resolvido" },
];

function normalizeStatusValue(status?: string | null): TicketModuleStatus | null {
    const normalized = (status || "").trim().toLowerCase();
    if (normalized === "novo" || normalized === "new") return "NEW";
    if (normalized === "sem dono" || normalized === "unassigned") return "UNASSIGNED";
    if (normalized === "triagem" || normalized === "triage") return "TRIAGE";
    if (normalized === "em andamento" || normalized === "in_progress") return "IN_PROGRESS";
    if (normalized === "em teste" || normalized === "testing") return "TESTING";
    if (normalized === "pendente cliente" || normalized === "waiting_customer") return "WAITING_CUSTOMER";
    if (normalized === "aguardando interno" || normalized === "waiting_internal") return "WAITING_INTERNAL";
    if (normalized === "resolvido" || normalized === "resolved") return "RESOLVED";
    if (normalized === "arquivado" || normalized === "archived") return "ARCHIVED";
    return null;
}

function StatusDropdown({
    status,
    disabled,
    onChange,
}: {
    status?: string | null;
    disabled?: boolean;
    onChange: (status: TicketModuleStatus) => void;
}) {
    const current = normalizeStatusValue(status);

    if (disabled) {
        return <StatusBadge status={status} />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className={cn("inline-flex rounded-full", !disabled && "hover:opacity-85")}>
                    <StatusBadge status={status} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Alterar status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusOptions.map((option) => (
                    <DropdownMenuItem key={option.value} className="text-xs" onSelect={() => onChange(option.value)}>
                        <span className="flex-1">{option.label}</span>
                        {current === option.value && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SlaCompact({ ticket, isClosedTicket }: { ticket: TicketDetailsItem; isClosedTicket: boolean }) {
    if (!ticket.slaResolutionDueAt || isClosedTicket) {
        return (
            <section className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SLA</p>
                <span className="text-xs text-muted-foreground">Sem SLA ativo</span>
            </section>
        );
    }

    const tone = ticket.slaPaused ? "paused" : ticket.slaBreached ? "danger" : ticket.slaWarning ? "warning" : "ok";
    const label = ticket.slaPaused ? "Pausado" : formatSlaDelta(ticket.minutesToBreach);
    const progress = ticket.slaPaused ? 50 : ticket.slaBreached ? 100 : ticket.slaWarning ? 85 : 30;

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Timer className={cn("h-3.5 w-3.5", tone === "danger" ? "text-rose-500" : tone === "warning" || tone === "paused" ? "text-amber-500" : "text-emerald-500")} />
                    SLA
                </p>
                <Badge variant="outline" className={cn(
                    "rounded-full px-2 text-[10px]",
                    tone === "danger" && "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                    tone === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    tone === "paused" && "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
                    tone === "ok" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                )}>
                    {label}
                </Badge>
            </div>
            <Progress
                value={progress}
                className={cn(
                    "h-2",
                    tone === "danger" && "bg-rose-200 *:animate-pulse *:bg-rose-500",
                    tone === "warning" && "bg-amber-200 *:bg-amber-500",
                    tone === "paused" && "bg-orange-100 *:bg-orange-500",
                    tone === "ok" && "bg-emerald-100 *:bg-emerald-500",
                )}
            />
            <SidebarField label="Vence em" value={<span className="font-mono text-xs text-muted-foreground">{new Date(ticket.slaResolutionDueAt).toLocaleString("pt-BR")}</span>} />
        </section>
    );
}

function formatSlaDelta(minutes?: number) {
    if (typeof minutes !== "number") return "Sem prazo";
    const sign = minutes < 0 ? "-" : "";
    const absolute = Math.abs(minutes);
    const hours = Math.floor(absolute / 60);
    const mins = absolute % 60;
    return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}h`;
}

function ExternalTicketLink({ href, label, icon: Icon = ExternalLink }: { href: string; label: string; icon?: ComponentType<{ className?: string }> }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline"
        >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{label}</span>
        </a>
    );
}

function StatusBadge({ status }: { status?: string | null }) {
    const lowerStatus = (status || "").toLowerCase();
    const style =
        lowerStatus.includes("resolvido") || lowerStatus.includes("fechado")
            ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
            : lowerStatus.includes("pendente") || lowerStatus.includes("aguardando")
                ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                : lowerStatus.includes("andamento") || lowerStatus.includes("aberto") || lowerStatus.includes("novo") || lowerStatus.includes("triagem") || lowerStatus.includes("teste")
                    ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";

    return (
        <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${style}`}>
            {status || "Desconhecido"}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: number }) {
    if (priority === 3) return <Badge variant="destructive" className="rounded-full px-2 text-[10px]">Alta</Badge>;
    if (priority === 1) return <Badge variant="secondary" className="rounded-full bg-muted px-2 text-[10px] text-muted-foreground">Baixa</Badge>;
    return <Badge variant="outline" className="rounded-full px-2 text-[10px] text-muted-foreground">Normal</Badge>;
}
