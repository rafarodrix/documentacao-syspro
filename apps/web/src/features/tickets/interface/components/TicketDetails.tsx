"use client";

import { ComponentType, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    ArrowLeft,
    AlertCircle,
    Building2,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock3,
    ExternalLink,
    Flag,
    Hash,
    Loader2,
    MessageSquare,
    Sparkles,
    Timer,
    UserRound,
    Video,
    Zap,
} from "lucide-react";
import { TicketChat } from "@/features/tickets/interface/components/TicketChat";
import { TransferTicketDialog } from "@/features/tickets/interface/components/TransferTicketDialog";
import { finalizeTicketAction, assignTicketToMeAction, triageTicketAction, unassignTicketToMeAction } from "@/features/tickets/application/ticket-actions";
import { useTicketHotkeys } from "@/features/tickets/interface/hooks/use-ticket-hotkeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [loadingAction, setLoadingAction] = useState<"finalize" | null>(null);
    const [resolutionSummary, setResolutionSummary] = useState(ticket?.resolutionSummary || "");
    const [resolutionVideoUrl, setResolutionVideoUrl] = useState(ticket?.resolutionVideoUrl || "");
    const [releaseTitle, setReleaseTitle] = useState(ticket?.releaseTitle || ticket?.title || "");
    const [releaseType, setReleaseType] = useState<"BUG" | "MELHORIA" | "">(
        ticket?.releaseType === "BUG" || ticket?.releaseType === "MELHORIA" ? ticket.releaseType : ""
    );
    const [releaseModule, setReleaseModule] = useState(ticket?.releaseModule || "");
    const [publishToReleases, setPublishToReleases] = useState(Boolean(ticket?.publishToReleases));
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const backUrl = "/portal/tickets";
    const shouldRequireReleaseFields = publishToReleases;
    const isClosedTicket = ticket?.status === "Resolvido" || ticket?.status === "Fechado" || ticket?.status === "Arquivado";

    useTicketHotkeys({
        onAssignToMe: () => {
            if (isAdmin && !ticket?.ownerId && !isClosedTicket) {
                startTransition(async () => {
                    const res = await assignTicketToMeAction(String(ticket?.id));
                    if (res.success) toast.success("Ticket atribuído a você (Atalho)");
                    else toast.error(res.error || "Erro ao atribuir");
                    router.refresh();
                });
            }
        },
        onChangeStatus: () => document.getElementById("transfer-ticket-btn")?.click(),
        onReply: () => document.getElementById("ticket-reply-input")?.focus(),
    });

    const runFinalizeAction = () => {
        if (!ticket) return;
        if (!resolutionSummary.trim()) {
            toast.error("Resolucao obrigatoria para finalizar o ticket.");
            return;
        }
        if (shouldRequireReleaseFields && !releaseType) {
            toast.error("Selecione o tipo da release para publicar no changelog.");
            return;
        }
        if (shouldRequireReleaseFields && !releaseTitle.trim()) {
            toast.error("Informe o titulo que vai aparecer no modulo de releases.");
            return;
        }

        setLoadingAction("finalize");
        startTransition(async () => {
            try {
                const result = await finalizeTicketAction({
                    ticketId: String(ticket.id),
                    resolutionSummary,
                    resolutionVideoUrl,
                    releaseType: shouldRequireReleaseFields && releaseType ? releaseType : undefined,
                    releaseTitle: shouldRequireReleaseFields ? releaseTitle : undefined,
                    releaseModule,
                    publishToReleases,
                });

                if (!result.success) {
                    toast.error(result.error);
                    return;
                }

                toast.success(result.message || "Ticket finalizado com sucesso.");
                router.refresh();
            } catch {
                toast.error("Erro ao finalizar ticket.");
            } finally {
                setLoadingAction(null);
            }
        });
    };

    if (error || !ticket) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="h-16 w-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Nao foi possivel carregar o chamado</h1>
                <p className="text-muted-foreground max-w-md mb-6">{error || "O ticket pode nao existir ou voce nao tem permissao."}</p>
                <Button variant="outline" asChild className="gap-2">
                    <Link href={backUrl}>
                        <ArrowLeft className="h-4 w-4" /> Voltar para lista
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1440px] mx-auto">
            {/* ── Breadcrumb header ─────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4 px-4 md:px-0">
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-full hover:bg-muted/80 shrink-0">
                    <Link href={backUrl}>
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link href={backUrl} className="hover:text-foreground transition-colors">Chamados</Link>
                    <span>/</span>
                    <Badge variant="secondary" className="gap-1 font-mono text-xs bg-muted/50 border-border/50">
                        <Hash className="h-3 w-3" />{ticket.number}
                    </Badge>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {isAdmin && ticket.status === "Novo" && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors text-xs" 
                            onClick={() => {
                                startTransition(async () => {
                                    const res = await triageTicketAction(String(ticket.id), { priority: "NORMAL" });
                                    if (res.success) toast.success("Triagem iniciada");
                                    else toast.error(res.error || "Erro na triagem");
                                    router.refresh();
                                });
                            }}
                            disabled={isPending}
                        >
                            <Sparkles className="h-3 w-3" /> Triar
                        </Button>
                    )}
                    {isAdmin && !ticket.ownerId && !isClosedTicket && (
                        <Button 
                            size="sm" 
                            className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors text-xs shadow-sm" 
                            onClick={() => {
                                startTransition(async () => {
                                    const res = await assignTicketToMeAction(String(ticket.id));
                                    if (res.success) toast.success("Ticket atribuído a você");
                                    else toast.error(res.error || "Erro ao atribuir");
                                    router.refresh();
                                });
                            }}
                            disabled={isPending}
                        >
                            <UserRound className="h-3 w-3" /> Assumir
                        </Button>
                    )}
                    {isAdmin && ticket.ownerId && ticket.ownerId === currentUserId && !isClosedTicket && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 gap-1 border-muted-foreground/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-xs shadow-sm" 
                            onClick={() => {
                                startTransition(async () => {
                                    const res = await unassignTicketToMeAction(String(ticket.id));
                                    if (res.success) toast.success("Ticket liberado com sucesso.");
                                    else toast.error(res.error || "Erro ao liberar");
                                    router.refresh();
                                });
                            }}
                            disabled={isPending}
                        >
                            <UserRound className="h-3 w-3" /> Liberar
                        </Button>
                    )}
                    {isAdmin && !isClosedTicket && (
                        <span id="transfer-ticket-btn-wrapper">
                            <TransferTicketDialog
                               ticketId={ticket.id}
                               currentTeam={ticket.operations?.currentTeam || undefined}
                               currentStatus={ticket.status}
                            />
                        </span>
                    )}
                    <StatusBadge status={ticket.status} />
                </div>
            </div>

            {/* ── Title bar ─────────────────────────────────────────────── */}
            <div className="px-4 md:px-0 mb-6">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-snug break-words">{ticket.title}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
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

            {/* ── Split layout: Chat (8) + Sidebar (4) ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 md:px-0 pb-10">

                {/* ── Main content (Chat area) ─────────────────────────── */}
                <div className="lg:col-span-8 space-y-6">
                    {/* SLA summary pills */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <SummaryPill
                            label="SLA"
                            value={ticket.slaBreached ? "Estourado" : ticket.slaWarning ? "Alerta" : "No prazo"}
                            icon={Timer}
                            tone={ticket.slaBreached ? "danger" : ticket.slaWarning ? "warning" : "ok"}
                            helper={ticket.slaWarning && typeof ticket.minutesToBreach === "number" ? `~${ticket.minutesToBreach} min` : undefined}
                        />
                        <SummaryPill
                            label="1a Resposta"
                            value={ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toLocaleString("pt-BR") : "Pendente"}
                            icon={Sparkles}
                            tone={ticket.firstResponseAt ? "ok" : "neutral"}
                        />
                        <SummaryPill
                            label="Resolucao"
                            value={ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString("pt-BR") : "Pendente"}
                            icon={Flag}
                            tone={ticket.resolvedAt ? "ok" : "neutral"}
                        />
                        <SummaryPill
                            label="Responsavel"
                            value={ticket.ownerName || (ticket.ownerId ? `Owner #${ticket.ownerId}` : "Sem dono")}
                            icon={UserRound}
                            tone={ticket.ownerId ? "ok" : "warning"}
                        />
                    </div>

                    {/* Chat timeline */}
                    <TicketChat ticketId={String(ticket.id)} articles={articles || []} ticketStatus={ticket.status || ""} />
                </div>

                {/* ── Sidebar ──────────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-4">

                    {/* Sidebar toggle (mobile) */}
                    <button
                        className="lg:hidden w-full flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-sm font-medium"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary/70" />
                            Detalhes do chamado
                        </span>
                        {sidebarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>

                    <div className={cn("space-y-4", sidebarCollapsed && "hidden lg:block")}>

                        {/* Metadata card */}
                        <Card className="border-border/60 bg-card/95 overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                                    Informacoes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                <SidebarField label="Status" value={<StatusBadge status={ticket.status} />} />
                                <SidebarField label="Prioridade" value={<PriorityBadge priority={ticket.priority} />} />
                                <SidebarField label="Responsavel" value={
                                    <span className="text-sm flex items-center gap-1.5">
                                        <UserRound className="h-3 w-3 text-muted-foreground" />
                                        {ticket.ownerName || (ticket.ownerId ? `#${ticket.ownerId}` : "Nao atribuido")}
                                    </span>
                                } />
                                {ticket.operations?.currentTeam && (
                                    <SidebarField label="Setor" value={<span className="text-xs">{ticket.operations.currentTeam}</span>} />
                                )}
                                {ticket.operations?.module && (
                                    <SidebarField label="Modulo" value={<span className="text-xs">{ticket.operations.module}</span>} />
                                )}
                                {ticket.operations?.environment && (
                                    <SidebarField label="Ambiente" value={<span className="text-xs">{ticket.operations.environment}</span>} />
                                )}
                                {ticket.operations?.category && (
                                    <SidebarField label="Categoria" value={<span className="text-xs">{ticket.operations.category}</span>} />
                                )}
                                <Separator className="my-2" />
                                {ticket.operations?.openedByName && (
                                    <SidebarField label="Operador" value={<span className="text-xs">{ticket.operations.openedByName}</span>} />
                                )}
                                {ticket.operations?.supportOwnerName && (
                                    <SidebarField label="Resp. suporte" value={<span className="text-xs">{ticket.operations.supportOwnerName}</span>} />
                                )}
                                {ticket.operations?.developmentOwnerName && (
                                    <SidebarField label="Resp. desenvolvimento" value={<span className="text-xs">{ticket.operations.developmentOwnerName}</span>} />
                                )}
                                {ticket.resolvedByName && (
                                    <SidebarField label="Resolvido por" value={<span className="text-xs">{ticket.resolvedByName}</span>} />
                                )}
                                <SidebarField label="Criado em" value={<span className="text-xs font-mono text-muted-foreground">{ticket.createdAt}</span>} />
                                {ticket.updatedAt && (
                                    <SidebarField label="Atualizado" value={<span className="text-xs font-mono text-muted-foreground">{new Date(ticket.updatedAt).toLocaleDateString("pt-BR")}</span>} />
                                )}
                                {ticket.resolvedAt && (
                                    <SidebarField label="Resolvido em" value={<span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{new Date(ticket.resolvedAt).toLocaleString("pt-BR")}</span>} />
                                )}
                            </CardContent>
                        </Card>

                        {/* Origin card (if from chatwoot or external) */}
                        {ticket.origin && ticket.origin.source && (
                            <Card className="border-border/60 bg-card/95">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                                        Origem
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 pt-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide px-2">
                                            {ticket.origin.source}
                                        </Badge>
                                    </div>
                                    {ticket.origin.contactName && (
                                        <SidebarField label="Contato" value={<span className="text-xs">{ticket.origin.contactName}</span>} />
                                    )}
                                    {ticket.origin.contactPhone && (
                                        <SidebarField label="Telefone" value={<span className="text-xs font-mono">{ticket.origin.contactPhone}</span>} />
                                    )}
                                    {ticket.origin.contactWhatsapp && (
                                        <SidebarField label="WhatsApp" value={<span className="text-xs font-mono">{ticket.origin.contactWhatsapp}</span>} />
                                    )}
                                    {ticket.origin.chatwootConversationUrl && (
                                        <a
                                            href={ticket.origin.chatwootConversationUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Ver no Chatwoot
                                        </a>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Finalization card (admin only) */}
                        {isAdmin && (
                            <Card className="border-border/60 bg-card/95">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Flag className="h-3.5 w-3.5 text-primary/70" />
                                        Fechamento e Release
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-0">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolucao</Label>
                                        <Textarea
                                            rows={4}
                                            placeholder="Descreva a solucao aplicada..."
                                            className="text-xs resize-y"
                                            value={resolutionSummary}
                                            onChange={(e) => setResolutionSummary(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titulo da release</Label>
                                        <Input
                                            placeholder="Titulo publico da melhoria/correcao"
                                            className="text-xs h-9"
                                            value={releaseTitle}
                                            onChange={(e) => setReleaseTitle(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo da release</Label>
                                        <Select value={releaseType} onValueChange={(val) => setReleaseType(val as "BUG" | "MELHORIA" | "")}>
                                            <SelectTrigger className="text-xs h-9">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MELHORIA">Melhoria</SelectItem>
                                                <SelectItem value="BUG">Bug</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modulo</Label>
                                        <Input
                                            placeholder="Ex.: Fiscal, Vendas..."
                                            className="text-xs h-9"
                                            value={releaseModule}
                                            onChange={(e) => setReleaseModule(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Video</Label>
                                        <div className="relative">
                                            <Video className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                            <Input
                                                placeholder="https://www.youtube.com/..."
                                                className="text-xs h-9 pl-7"
                                                value={resolutionVideoUrl}
                                                onChange={(e) => setResolutionVideoUrl(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-primary transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={publishToReleases}
                                            onChange={(e) => setPublishToReleases(e.target.checked)}
                                            className="rounded border-border"
                                        />
                                        Publicar no modulo de releases
                                    </label>

                                    <Button
                                        size="sm"
                                        className="w-full gap-2"
                                        onClick={runFinalizeAction}
                                        disabled={isPending && loadingAction === "finalize"}
                                    >
                                        {isPending && loadingAction === "finalize" ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Flag className="h-3.5 w-3.5" />
                                        )}
                                        {ticket.resolvedAt ? "Atualizar fechamento" : "Finalizar ticket"}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SidebarField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">{label}</span>
            <div className="text-right">{value}</div>
        </div>
    );
}

function ExternalTicketLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
            {label}
            <ExternalLink className="h-3 w-3" />
        </a>
    );
}

function SummaryPill({ label, value, helper, icon: Icon, tone }: {
    label: string;
    value: string;
    helper?: string;
    icon: ComponentType<{ className?: string }>;
    tone: "ok" | "warning" | "danger" | "neutral";
}) {
    const toneClass =
        tone === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
        tone === "warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" :
        tone === "danger" ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400" :
        "border-border/60 bg-muted/20 text-foreground";
    return (
        <Card className={`border ${toneClass}`}>
            <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide opacity-80">
                    <Icon className="h-3 w-3" />
                    {label}
                </div>
                <p className="mt-0.5 text-xs font-medium leading-tight">{value}</p>
                {helper && <p className="text-[10px] opacity-70 mt-0.5">{helper}</p>}
            </CardContent>
        </Card>
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
        <Badge variant="outline" className={`border ${style} font-medium capitalize px-2.5 py-0.5 text-[11px] rounded-full`}>
            {status || "Desconhecido"}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: number }) {
    if (priority === 3) return <Badge variant="destructive" className="text-[10px] px-2 rounded-full">Alta</Badge>;
    if (priority === 1) return <Badge variant="secondary" className="text-[10px] px-2 rounded-full bg-muted text-muted-foreground">Baixa</Badge>;
    return <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground rounded-full">Normal</Badge>;
}
