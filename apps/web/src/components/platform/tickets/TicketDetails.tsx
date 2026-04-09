"use client";

import { ComponentType, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    ArrowLeft,
    AlertCircle,
    Clock3,
    Hash,
    Timer,
    Flag,
    UserRound,
    Loader2,
    Sparkles,
    MessageSquareShare,
    Phone,
    User,
    ExternalLink,
} from "lucide-react";
import { TicketChat } from "@/components/platform/tickets/TicketChat";
import { finalizeTicketAction } from "@/features/tickets/application/ticket-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TicketArticleItem, TicketDetailsItem } from "./types";
import type { TicketMutationResponse } from "@/features/tickets/domain/ticket-model";

interface TicketDetailsProps {
    ticket?: TicketDetailsItem;
    articles: TicketArticleItem[];
    isAdmin: boolean;
    error?: string;
}

export function TicketDetails({ ticket, articles, isAdmin, error }: TicketDetailsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [loadingAction, setLoadingAction] = useState<"assume" | "priority_high" | "macro_followup" | "finalize" | null>(null);
    const [resolutionSummary, setResolutionSummary] = useState(ticket?.resolutionSummary || "");
    const [resolutionVideoUrl, setResolutionVideoUrl] = useState(ticket?.resolutionVideoUrl || "");
    const [releaseType, setReleaseType] = useState<"BUG" | "MELHORIA" | "">(
        ticket?.releaseType === "BUG" || ticket?.releaseType === "MELHORIA" ? ticket.releaseType : ""
    );
    const [releaseModule, setReleaseModule] = useState(ticket?.releaseModule || "");
    const [publishToReleases, setPublishToReleases] = useState(Boolean(ticket?.publishToReleases));
    const backUrl = "/portal/tickets";
    const shouldRequireReleaseFields = publishToReleases;

    const runQuickAction = (action: "assume" | "priority_high" | "macro_followup") => {
        if (!ticket) return;
        setLoadingAction(action);

        startTransition(async () => {
            try {
                const response = await fetch(`/api/platform/tickets/${ticket.id}/quick-actions`, {
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

        setLoadingAction("finalize");
        startTransition(async () => {
            try {
                const result = await finalizeTicketAction({
                    ticketId: String(ticket.id),
                    resolutionSummary,
                    resolutionVideoUrl,
                    releaseType: shouldRequireReleaseFields && releaseType ? releaseType : undefined,
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

    const releasePreview = {
        id: ticket.number,
        type: releaseType === "BUG" ? "Bug" : releaseType === "MELHORIA" ? "Melhoria" : "Nao definido",
        title: ticket.title,
        summary: resolutionSummary.trim(),
        videoLink: resolutionVideoUrl.trim() || null,
        tags: releaseModule.trim() ? [releaseModule.trim()] : [],
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto p-4 md:p-0">
            <Card className="border-border/60 bg-linear-to-b from-card via-card to-muted/10">
                <CardHeader className="gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-full hover:bg-muted/80 shrink-0 mt-0.5">
                                <Link href={backUrl}>
                                    <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                                </Link>
                            </Button>

                            <div className="min-w-0">
                                <CardTitle className="text-xl md:text-2xl tracking-tight leading-snug wrap-break-word">
                                    {ticket.title}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <Badge variant="secondary" className="gap-1 font-mono text-xs bg-muted/50 border-border/50">
                                        <Hash className="h-3 w-3" /> {ticket.number}
                                    </Badge>
                                    <span className="text-xs flex items-center gap-1">
                                        <Clock3 className="h-3 w-3" /> Criado em {ticket.createdAt}
                                    </span>
                                    {ticket.updatedAt && (
                                        <span className="text-xs">Atualizado em {new Date(ticket.updatedAt).toLocaleString("pt-BR")}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <StatusBadge status={ticket.status} />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <SummaryPill
                            label="SLA"
                            value={ticket.slaBreached ? "Estourado" : ticket.slaWarning ? "Alerta" : "No prazo"}
                            icon={Timer}
                            tone={ticket.slaBreached ? "danger" : ticket.slaWarning ? "warning" : "ok"}
                            helper={ticket.slaWarning && typeof ticket.minutesToBreach === "number" ? `~${ticket.minutesToBreach} min` : undefined}
                        />
                        <SummaryPill
                            label="Primeira resposta"
                            value={ticket.firstResponseAt ? new Date(ticket.firstResponseAt).toLocaleString("pt-BR") : "Nao registrada"}
                            icon={Sparkles}
                            tone={ticket.firstResponseAt ? "ok" : "neutral"}
                        />
                        <SummaryPill
                            label="Resolucao"
                            value={ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString("pt-BR") : "Em andamento"}
                            icon={Flag}
                            tone={ticket.resolvedAt ? "ok" : "neutral"}
                        />
                        <SummaryPill
                            label="Responsavel"
                            value={ticket.ownerId ? `Owner #${ticket.ownerId}` : "Sem dono"}
                            icon={UserRound}
                            tone={ticket.ownerId ? "ok" : "warning"}
                        />
                    </div>

                    {isAdmin && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            <QuickButton
                                label="Assumir ticket"
                                pending={isPending && loadingAction === "assume"}
                                onClick={() => runQuickAction("assume")}
                            />
                            <QuickButton
                                label="Prioridade alta"
                                pending={isPending && loadingAction === "priority_high"}
                                onClick={() => runQuickAction("priority_high")}
                            />
                            <QuickButton
                                label="Aplicar macro"
                                pending={isPending && loadingAction === "macro_followup"}
                                onClick={() => runQuickAction("macro_followup")}
                            />
                        </div>
                    )}
                </CardHeader>
            </Card>

            {ticket.origin && (ticket.origin.chatwootConversationId || ticket.origin.externalThreadId || ticket.origin.contactName || ticket.origin.contactPhone || ticket.origin.contactWhatsapp) ? (
                <Card className="border-border/60 bg-card/80">
                    <CardHeader>
                        <CardTitle className="text-base">Origem do atendimento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <OriginPill
                                label="Canal de origem"
                                value={ticket.origin.source === "chatwoot" ? "Chatwoot" : ticket.origin.source || "Nao informado"}
                                icon={MessageSquareShare}
                            />
                            <OriginPill
                                label="Conversa"
                                value={ticket.origin.chatwootConversationId || ticket.origin.externalThreadId || "Nao vinculada"}
                                icon={Hash}
                            />
                            <OriginPill
                                label="Contato"
                                value={ticket.origin.contactName || "Nao informado"}
                                icon={User}
                            />
                            <OriginPill
                                label="WhatsApp"
                                value={ticket.origin.contactWhatsapp || ticket.origin.contactPhone || "Nao informado"}
                                icon={Phone}
                            />
                        </div>

                        {ticket.origin.chatwootConversationUrl ? (
                            <Button variant="outline" asChild className="gap-2">
                                <a href={ticket.origin.chatwootConversationUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Abrir conversa no Chatwoot
                                </a>
                            </Button>
                        ) : null}
                    </CardContent>
                </Card>
            ) : null}

            {isAdmin && (
                <Card className="border-border/60 bg-card/80">
                    <CardHeader>
                        <CardTitle className="text-base">Fechamento e Release</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Resolucao</label>
                            <Textarea
                                rows={5}
                                placeholder="Descreva a solucao aplicada, impacto e orientacoes para o cliente."
                                value={resolutionSummary}
                                onChange={(event) => setResolutionSummary(event.target.value)}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Tipo para release {shouldRequireReleaseFields ? <span className="text-destructive">*</span> : null}
                                </label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={releaseType}
                                    onChange={(event) => setReleaseType(event.target.value as "BUG" | "MELHORIA" | "")}
                                >
                                    <option value="">Selecione</option>
                                    <option value="MELHORIA">Melhoria</option>
                                    <option value="BUG">Bug</option>
                                </select>
                                {!shouldRequireReleaseFields ? (
                                    <p className="text-xs text-muted-foreground">Opcional. So e exigido quando a publicacao em releases estiver marcada.</p>
                                ) : null}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Modulo ou tag</label>
                                <Input
                                    placeholder="Ex.: Fiscal, Vendas, Financeiro"
                                    value={releaseModule}
                                    onChange={(event) => setReleaseModule(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Link de video</label>
                            <Input
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={resolutionVideoUrl}
                                onChange={(event) => setResolutionVideoUrl(event.target.value)}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                                type="checkbox"
                                checked={publishToReleases}
                                onChange={(event) => {
                                    const nextChecked = event.target.checked;
                                    setPublishToReleases(nextChecked);
                                    if (!nextChecked && !ticket.publishToReleases) {
                                        setReleaseType("");
                                    }
                                }}
                            />
                            Publicar no modulo de releases
                        </label>

                        <p className="text-xs text-muted-foreground">
                            Voce pode atualizar esses dados depois sem reabrir o ticket. Se o item ja estiver publicado, a release sera atualizada na proxima leitura do modulo.
                        </p>

                        {publishToReleases ? (
                            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-foreground">Preview da release</p>
                                    <Badge variant="outline">{releasePreview.type}</Badge>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-foreground">{releasePreview.title}</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {releasePreview.summary || "Preencha a resolucao para visualizar o resumo publicado."}
                                    </p>
                                    {releasePreview.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {releasePreview.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-[11px] uppercase tracking-wide">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : null}
                                    {releasePreview.videoLink ? (
                                        <p className="text-xs text-muted-foreground break-all">
                                            Video: {releasePreview.videoLink}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        {ticket.resolutionSummary ? (
                            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">Resolucao atual</p>
                                <p className="mt-2 whitespace-pre-wrap">{ticket.resolutionSummary}</p>
                            </div>
                        ) : null}

                        <div className="flex justify-end">
                            <Button
                                onClick={runFinalizeAction}
                                disabled={isPending && loadingAction === "finalize"}
                                className="gap-2"
                            >
                                {isPending && loadingAction === "finalize" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {ticket.resolvedAt ? "Atualizar fechamento" : "Finalizar ticket"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <TicketChat ticketId={String(ticket.id)} articles={articles || []} ticketStatus={ticket.status || ""} />
        </div>
    );
}

function OriginPill({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
}) {
    return (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <p className="mt-1 text-sm font-medium text-foreground break-all">{value}</p>
        </div>
    );
}

function QuickButton({ label, pending, onClick }: { label: string; pending: boolean; onClick: () => void }) {
    return (
        <Button variant="outline" size="sm" onClick={onClick} disabled={pending} className="gap-2">
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            {label}
        </Button>
    );
}

function SummaryPill({
    label,
    value,
    helper,
    icon: Icon,
    tone,
}: {
    label: string;
    value: string;
    helper?: string;
    icon: ComponentType<{ className?: string }>;
    tone: "ok" | "warning" | "danger" | "neutral";
}) {
    const toneClass =
        tone === "ok"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : tone === "warning"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : tone === "danger"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-border/60 bg-muted/20 text-foreground";

    return (
        <Card className={`border ${toneClass}`}>
            <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                </div>
                <p className="mt-1 text-sm font-medium leading-tight">{value}</p>
                {helper && <p className="text-xs opacity-80 mt-0.5">{helper}</p>}
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status?: string | null }) {
    const s = (status || "").toLowerCase();
    let style = "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";

    if (["novo", "new", "aberto", "open"].some((v) => s.includes(v))) {
        style = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    }
    if (["resolvido", "closed", "fechado"].some((v) => s.includes(v))) {
        style = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    }
    if (["pendente", "pending", "analise"].some((v) => s.includes(v))) {
        style = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    }

    return (
        <Badge variant="outline" className={`border ${style} font-medium capitalize px-3 py-1 text-sm`}>
            {status || "Desconhecido"}
        </Badge>
    );
}

