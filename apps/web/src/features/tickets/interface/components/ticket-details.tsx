"use client";

import { useEffect, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ticketModuleDetailsResponseSchema } from "@dosc-syspro/contracts/ticket";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    ChevronUp,
    Clock3,
    Disc3,
    ExternalLink,
    Loader2,
    Search,
    Sparkles,
    Timer,
    UserRound,
    Zap,
} from "lucide-react";
import { type TicketModulePriority, type TicketModuleSettingsOption, type TicketModuleSettingsPriority, type TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import { updateTicketClassificationAction, updateTicketOwnersAction } from "@/features/tickets/application/ticket-actions";
import { mapTicketModuleDetailsResponse } from "@/features/tickets/application/ticket-details.mapper";
import { TicketChat } from "@/features/tickets/interface/components/ticket-chat";
import { TicketFinalizeDialog } from "@/features/tickets/interface/components/ticket-finalize-dialog";
import { TicketModuleCascadeSelect } from "@/features/tickets/interface/components/ticket-module-cascade-select";
import { TicketTestingReturnDialog } from "@/features/tickets/interface/components/ticket-testing-return-dialog";
import { useTicketHotkeys } from "@/features/tickets/interface/hooks/use-ticket-hotkeys";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, Input, Popover, PopoverContent, PopoverTrigger, Progress, ScrollArea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Separator } from "@dosc-syspro/ui";
import { formatModuleOptionLabel, humanizeModuleHierarchyValue } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { markdownToPlainText } from "@/features/tickets/lib/ticket-markdown";
import { trpc } from "@/lib/api/trpc-client";
import { cn } from "@/lib/utils";
import type { TicketArticleItem, TicketDetailsItem, TicketMessagePagination } from "./ticket-view.types";

interface TicketDetailsProps {
    ticket?: TicketDetailsItem;
    articles: TicketArticleItem[];
    messagePagination?: TicketMessagePagination;
    canManageTickets: boolean;
    error?: string;
    currentUserId?: string;
}

const TICKET_HISTORY_PAGE_SIZE = 50;

type InternalUserOption = {
    id: string;
    name: string | null;
    email: string;
    role: string;
    isActive?: boolean;
};

export function TicketDetails({ ticket, articles, messagePagination, canManageTickets, error, currentUserId }: TicketDetailsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [finalizeOpen, setFinalizeOpen] = useState(false);
    const [testingReturnOpen, setTestingReturnOpen] = useState(false);
    const ticketSettings = useTicketModuleSettings();
    const [internalUsers, setInternalUsers] = useState<InternalUserOption[]>([]);
    const [localTeam, setLocalTeam] = useState(ticket?.operations?.currentTeam || "");
    const [localModule, setLocalModule] = useState(ticket?.operations?.module || "");
    const [localCategory, setLocalCategory] = useState(ticket?.operations?.category || "");
    const [localPriority, setLocalPriority] = useState(ticket?.priority);
    const [transferNote, setTransferNote] = useState("");
    const [timelineArticles, setTimelineArticles] = useState<TicketArticleItem[]>(() => (ticket ? withTechnicalResourceArticles(articles || [], ticket) : (articles || [])));
    const [timelinePagination, setTimelinePagination] = useState<TicketMessagePagination | undefined>(messagePagination);
    const [isLoadingOlderArticles, setIsLoadingOlderArticles] = useState(false);
    const backUrl = "/portal/tickets";
    const isClosedTicket = ticket ? isTicketClosed(ticket.status) : false;
    void currentUserId;

    useEffect(() => {
        let active = true;

        async function loadSettings() {
            try {
                const usersPayload = await trpc.users.list.query({});

                if (active) {
                    setInternalUsers((usersPayload as InternalUserOption[]).filter((user) => user.isActive !== false));
                }
            } catch {
                if (active) {
                    setInternalUsers([]);
                }
            }
        }

        loadSettings();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        setLocalTeam(ticket?.operations?.currentTeam || "");
        setLocalModule(ticket?.operations?.module || "");
        setLocalCategory(ticket?.operations?.category || "");
        setLocalPriority(ticket?.priority);
        setTransferNote("");
    }, [ticket?.id, ticket?.operations?.category, ticket?.operations?.currentTeam, ticket?.operations?.module, ticket?.priority]);

    useEffect(() => {
        setTimelineArticles(ticket ? withTechnicalResourceArticles(articles || [], ticket) : (articles || []));
    }, [articles, ticket]);

    useEffect(() => {
        setTimelinePagination(messagePagination);
    }, [messagePagination]);

    const handleArchiveTicket = async () => {
        if (!ticket) return;

        try {
            setIsArchiving(true);
            const res = await trpc.tickets.archive.mutate({
                id: String(ticket.id),
            });

            if (res.success && res.status === "ARCHIVED") {
                setArchiveDialogOpen(false);
                toast.success(res.message || "Ticket arquivado com sucesso.");
                router.push(backUrl);
                return;
            }

            toast.error(
                res.error ||
                (res.success
                    ? "O ticket nao retornou com status arquivado."
                    : "Erro ao arquivar ticket."),
            );
        } catch {
            toast.error("Erro ao arquivar ticket.");
        } finally {
            setIsArchiving(false);
        }
    };

    const changeStatus = (status: TicketModuleStatus) => {
        if (!ticket) return;
        if (status === "RESOLVED") {
            setFinalizeOpen(true);
            return;
        }
        if (status === "IN_PROGRESS" && normalizeStatusValue(ticket.status) === "TESTING" && ticketSettings.requireTestingReturnReason) {
            setTestingReturnOpen(true);
            return;
        }

        persistWorkflowChange(status, classificationDirty ? "Classificacao e estagio atualizados." : "Estagio atualizado.");
    };

    const initialTeam = ticket?.operations?.currentTeam || ticketSettings.defaultTeam || "SUPORTE";
    const initialModule = ticket?.operations?.module || "";
    const initialCategory = ticket?.operations?.category || "";
    const initialPriority = ticket?.priority ?? 2;
    const currentTeam = localTeam || ticket?.operations?.currentTeam || ticketSettings.defaultTeam || "SUPORTE";
    const currentModule = localModule || ticket?.operations?.module || "";
    const currentCategory = localCategory || ticket?.operations?.category || "";
    const currentPriority = localPriority ?? ticket?.priority ?? 2;

    const changeTeam = (team: string) => {
        if (!ticket || team === currentTeam) return;
        const nextCategory = resolveCategoryForTeam(ticketSettings.categories, team, currentCategory);
        setLocalTeam(team);
        if (nextCategory !== currentCategory) setLocalCategory(nextCategory);
        if (team !== "DESENVOLVIMENTO") setTransferNote("");
    };

    const changeClassification = (payload: { module?: string; category?: string; priority?: TicketModulePriority }) => {
        if (payload.module !== undefined) setLocalModule(payload.module);
        if (payload.category !== undefined) setLocalCategory(payload.category);
        if (payload.priority !== undefined) setLocalPriority(mapPriorityToLevel(payload.priority));
    };

    const resetClassificationDraft = () => {
        setLocalTeam(ticket?.operations?.currentTeam || "");
        setLocalModule(ticket?.operations?.module || "");
        setLocalCategory(ticket?.operations?.category || "");
        setLocalPriority(ticket?.priority);
        setTransferNote("");
    };

    const classificationDirty =
        currentTeam !== initialTeam ||
        currentModule !== initialModule ||
        currentCategory !== initialCategory ||
        currentPriority !== initialPriority;
    const movingToDevelopment = currentTeam === "DESENVOLVIMENTO" && initialTeam !== "DESENVOLVIMENTO";
    const returningFromTesting = normalizeStatusValue(ticket?.status) === "TESTING";
    const requiresTransferNote = movingToDevelopment && canManageTickets;
    const requiresTestingReturnNote = returningFromTesting && canManageTickets && ticketSettings.requireTestingReturnReason;

    const persistWorkflowChange = (status?: TicketModuleStatus, successMessage = "Alteracoes salvas.") => {
        if (!ticket) return;

        const payload: { team?: string; module?: string; category?: string; priority?: TicketModulePriority; status?: TicketModuleStatus; note?: string } = {};
        if (currentTeam !== initialTeam) payload.team = currentTeam;
        if (currentModule !== initialModule) payload.module = currentModule;
        if (currentCategory !== initialCategory) payload.category = currentCategory;
        if (currentPriority !== initialPriority) payload.priority = mapLevelToPriority(currentPriority);
        if (status) payload.status = status;
        if (movingToDevelopment) {
            const normalizedNote = transferNote.trim();
            if (normalizedNote.length < 20) {
                toast.error("Informe o contexto para o desenvolvimento com no minimo 20 caracteres.");
                return;
            }
            payload.note = normalizedNote;
        }

        if (!Object.keys(payload).length) return;

        startTransition(async () => {
            const res = await updateTicketClassificationAction(String(ticket.id), payload);
            if (res.success) {
                toast.success(successMessage);
                setTransferNote("");
            } else {
                toast.error(res.error || "Erro ao atualizar ticket");
            }
            router.refresh();
        });
    };

    const saveClassification = () => {
        if (!ticket || !classificationDirty) return;
        persistWorkflowChange(undefined, "Alteracoes salvas.");
    };

    useTicketHotkeys({
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

    const categoryOptions = getCategoriesForTeam(ticketSettings.categories, currentTeam, currentCategory);
    const canManageRelease = currentTeam === "DESENVOLVIMENTO" || Boolean(ticket.publishToReleases);
    const supportUsers = getAssignableUsers(internalUsers, "SUPORTE");
    const developmentUsers = getAssignableUsers(internalUsers, "DESENVOLVIMENTO");

    const loadOlderArticles = async () => {
        if (!ticket || isLoadingOlderArticles || !timelinePagination?.hasNextPage) {
            return false;
        }

        setIsLoadingOlderArticles(true);
        try {
            const query = new URLSearchParams({
                page: String(timelinePagination.page + 1),
                pageSize: String(timelinePagination.pageSize || TICKET_HISTORY_PAGE_SIZE),
            });
            const response = await fetch(`/api/tickets/${ticket.id}?${query.toString()}`, {
                cache: "no-store",
            });
            const payload = ticketModuleDetailsResponseSchema.parse(await response.json());
            const mapped = mapTicketModuleDetailsResponse(payload);

            if (!mapped.success) {
                toast.error(mapped.error || "Nao foi possivel carregar o historico anterior.");
                return false;
            }

            const nextArticles = withTechnicalResourceArticles(mapped.articles, ticket);
            setTimelineArticles((current) => {
                const seen = new Set<string>();
                return [...nextArticles, ...current].filter((article) => {
                    const key = String(article.id);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            });
            setTimelinePagination(mapped.messagePagination);
            return true;
        } catch (loadError) {
            console.error("Erro ao carregar historico anterior do ticket:", loadError);
            toast.error("Nao foi possivel carregar o historico anterior.");
            return false;
        } finally {
            setIsLoadingOlderArticles(false);
        }
    };

    return (
        <div className="mx-auto max-w-360 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-4 flex items-center gap-3 px-4 md:px-0">
                <Button variant="ghost" size="icon" asChild className="h-9 w-9 shrink-0 rounded-full hover:bg-muted/80">
                    <Link href={backUrl}>
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </Button>
                <span className="font-mono text-xs text-muted-foreground">{ticket.number}</span>
            </div>

            <div className="mb-6 px-4 md:px-0">
                <h1 className="max-w-full wrap-break-word text-xl font-bold leading-snug tracking-tight text-foreground md:text-2xl">{ticket.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> Criado em {ticket.createdAt}
                    </span>
                    {ticket.operations?.openedByName && (
                        <span className="flex items-center gap-1">
                            <UserRound className="h-3 w-3" /> Aberto por {ticket.operations.openedByName}
                        </span>
                    )}
                    {ticket.updatedAt && (
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Atualizado em {formatTicketDate(ticket.updatedAt)}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 px-4 pb-10 md:px-0 lg:grid-cols-12">
                <div className="min-w-0 space-y-6 lg:col-span-8">
                    <TicketChat
                        ticketId={String(ticket.id)}
                        articles={timelineArticles}
                        ticketStatus={ticket.status || ""}
                        messagePagination={timelinePagination}
                        isLoadingOlder={isLoadingOlderArticles}
                        onLoadOlder={loadOlderArticles}
                    />
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
                            <div className="absolute left-0 top-0 h-0.5 w-full bg-linear-to-r from-transparent via-primary/40 to-transparent" />
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                                    Informacoes
                                    {classificationDirty && (
                                        <Badge variant="outline" className="ml-auto rounded-full border-amber-500/30 bg-amber-500/10 px-2 text-[10px] text-amber-600 dark:text-amber-400">
                                            Rascunho
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <section className="space-y-3">
                                    <EditableSidebarField label="Setor atual">
                                        <NativeSelectPill
                                            id="transfer-ticket-btn"
                                            value={currentTeam}
                                            label={resolveOptionLabel(ticketSettings.teams, currentTeam)}
                                            disabled={!canManageTickets || isPending}
                                            options={ticketSettings.teams.map((team) => ({ value: team.value, label: team.label }))}
                                            onChange={changeTeam}
                                        />
                                    </EditableSidebarField>
                                    <EditableSidebarField label="Categoria">
                                        <ClassificationDropdown
                                            value={currentCategory}
                                            fallback="Nao definida"
                                            options={categoryOptions}
                                            disabled={!canManageTickets || isPending}
                                            onChange={(category) => changeClassification({ category })}
                                        />
                                    </EditableSidebarField>
                                    <EditableSidebarField label="Estagio atual">
                                        <StatusDropdown
                                            status={ticket.status}
                                            disabled={!canManageTickets || isPending}
                                            onChange={changeStatus}
                                        />
                                    </EditableSidebarField>
                                    <EditableSidebarField label="Prioridade">
                                        <PriorityDropdown
                                            priority={currentPriority}
                                            options={ticketSettings.priorities}
                                            disabled={!canManageTickets || isPending}
                                            onChange={(priority) => changeClassification({ priority })}
                                        />
                                    </EditableSidebarField>
                                    <EditableSidebarField label="Modulo">
                                        <TicketModuleCascadeSelect
                                            options={ticketSettings.modules}
                                            value={currentModule}
                                            onChange={(module) => changeClassification({ module })}
                                            disabled={!canManageTickets || isPending}
                                            compact
                                            mode="single"
                                            labels={{
                                                single: "Modulo, submodulo e tela",
                                            }}
                                        />
                                    </EditableSidebarField>
                                    {requiresTransferNote && (
                                        <EditableSidebarField label="Contexto para o desenvolvimento">
                                            <Textarea
                                                value={transferNote}
                                                onChange={(event) => setTransferNote(event.target.value)}
                                                placeholder={
                                                    "Descreva o que ja foi validado, comportamento esperado, comportamento atual e impacto no cliente."
                                                }
                                                className="min-h-24 resize-none border-border/70 bg-background text-sm"
                                                disabled={isPending}
                                            />
                                            <p className="mt-1 text-[10px] text-muted-foreground">
                                                Minimo 20 caracteres. O ticket vai entrar em Desenvolvimento como Novo e sem desenvolvedor assumido.
                                            </p>
                                        </EditableSidebarField>
                                    )}
                                    {requiresTestingReturnNote && (
                                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                                            Ao voltar de <span className="font-medium text-foreground">Em teste</span> para <span className="font-medium text-foreground">Em desenvolvimento</span>, o sistema abre uma tela para registrar o motivo como nota interna e disparar a automacao.
                                        </div>
                                    )}
                                    {canManageTickets && classificationDirty && (
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-8 flex-1 text-xs"
                                                disabled={isPending}
                                                onClick={saveClassification}
                                            >
                                                {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                                                Salvar alteracoes
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs"
                                                disabled={isPending}
                                                onClick={resetClassificationDraft}
                                            >
                                                <Disc3 className="mr-2 h-3.5 w-3.5" />
                                                Descartar
                                            </Button>
                                        </div>
                                    )}
                                </section>

                                <Separator />
                                <SlaCompact ticket={ticket} isClosedTicket={isClosedTicket} />

                                {isClosedTicket && canManageTickets && canManageRelease && (
                                    <>
                                        <Separator />
                                        <section className="space-y-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Release</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-9 w-full justify-start border-emerald-500/30 text-xs text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                                onClick={() => setFinalizeOpen(true)}
                                            >
                                                {ticket.publishToReleases ? "Atualizar publicacao" : "Publicar em Releases"}
                                            </Button>
                                        </section>
                                    </>
                                )}

                                <Separator />
                                <section className="space-y-3">
                                    <SupportPeopleFields
                                        ticket={ticket}
                                        canManageTickets={canManageTickets}
                                        isPending={isPending}
                                        supportUsers={supportUsers}
                                        developmentUsers={developmentUsers}
                                        onUpdateOwners={(payload) => {
                                            startTransition(async () => {
                                                const res = await updateTicketOwnersAction(String(ticket.id), payload);
                                                if (res.success) {
                                                    toast.success("Responsaveis atualizados.");
                                                } else {
                                                    toast.error(res.error || "Erro ao atualizar responsaveis");
                                                }
                                                router.refresh();
                                            });
                                        }}
                                    />
                                    <SidebarField label="Resolucao" value={<DetailDate value={ticket.resolvedAt} fallback="Pendente" />} />
                                </section>

                                <Separator />
                                <section className="space-y-3">
                                    {ticket.resolvedByName && <SidebarField label="Resolvido por" value={<span className="text-xs">{ticket.resolvedByName}</span>} />}
                                </section>

                                {canManageTickets && !isClosedTicket && (
                                    <>
                                        <Separator />
                                        <section className="space-y-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acoes</p>
                                            <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-9 w-full justify-start border-red-500/30 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-700"
                                                        disabled={isPending}
                                                    >
                                                        Arquivar ticket
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Arquivar ticket?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acao move o ticket para arquivados e remove ele da fila ativa. O historico permanece disponivel para auditoria.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
                                                        <Button
                                                            type="button"
                                                            className="bg-red-600 text-white hover:bg-red-700"
                                                            onClick={handleArchiveTicket}
                                                            disabled={isArchiving}
                                                        >
                                                            {isArchiving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                                                            Confirmar arquivamento
                                                        </Button>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </section>
                                    </>
                                )}
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
            <TicketTestingReturnDialog
                ticket={ticket}
                open={testingReturnOpen}
                onOpenChange={setTestingReturnOpen}
                payload={{
                    ...(currentTeam !== initialTeam ? { team: currentTeam } : {}),
                    ...(currentModule !== initialModule ? { module: currentModule } : {}),
                    ...(currentCategory !== initialCategory ? { category: currentCategory } : {}),
                    ...(currentPriority !== initialPriority ? { priority: mapLevelToPriority(currentPriority) } : {}),
                    status: "IN_PROGRESS",
                }}
                successMessage={classificationDirty ? "Classificacao e estagio atualizados." : "Estagio atualizado."}
            />
        </div>
    );
}

function isTicketClosed(status?: string | null) {
    const normalized = (status || "").toLowerCase();
    return ["resolvido", "resolved", "fechado", "arquivado", "archived", "finalizado"].some((item) => normalized.includes(item));
}

function withTechnicalResourceArticles(articles: TicketArticleItem[], ticket: TicketDetailsItem): TicketArticleItem[] {
    const resources = [
        { id: "database", label: "Base de dados", url: ticket.operations?.databaseUrl },
        { id: "video", label: "Video explicativo", url: ticket.operations?.developmentVideoUrl },
    ].filter((resource): resource is { id: string; label: string; url: string } => Boolean(resource.url));

    if (!resources.length) return articles;

    const existingTechnicalResourceArticles = articles.filter((article) => isTechnicalResourceArticle(article));
    if (existingTechnicalResourceArticles.some((article) => article.messageType !== "SYSTEM_EVENT")) {
        return articles;
    }

    const cleanedArticles = articles.filter((article) => !isTechnicalResourceArticle(article));
    const openingArticleIndex = findOpeningArticleIndex(cleanedArticles);

    if (openingArticleIndex === -1) return cleanedArticles;

    const openingArticle = cleanedArticles[openingArticleIndex];
    const existingResourcesArticle = cleanedArticles.find((article) => article.id === "opening-technical-resources");
    const missingResources = resources.filter(
        (resource) =>
            !openingArticle.body.includes(resource.url) &&
            !existingResourcesArticle?.body.includes(resource.url),
    );

    if (!missingResources.length) return cleanedArticles;

    const resourceMarkdown = missingResources
        .map((resource) => {
            return [`### ${resource.label}`, `[${resource.url}](${resource.url})`].join("\n");
        })
        .join("\n\n");

    const resourceBody = [
        "## Recursos tecnicos para abertura do ticket",
        resourceMarkdown,
    ].join("\n\n");

    const nextArticles = [...cleanedArticles];
    nextArticles.splice(openingArticleIndex + 1, 0, {
        id: "opening-technical-resources",
        from: "Recursos internos",
        body: resourceBody,
        createdAt: openingArticle.createdAt,
        sender: "Agent",
        isInternal: true,
        messageType: "TEXT",
    });

    return nextArticles.filter((article, index, currentArticles) => {
        if (article.id !== "opening-technical-resources") return true;
        return currentArticles.findIndex((candidate) => candidate.id === "opening-technical-resources") === index;
    });
}

function findOpeningArticleIndex(articles: TicketArticleItem[]) {
    let bestIndex = -1;
    let bestTimestamp = Number.POSITIVE_INFINITY;

    articles.forEach((article, index) => {
        if (article.messageType === "SYSTEM_EVENT" || isTechnicalResourceArticle(article) || !stripHtml(article.body).trim()) {
            return;
        }

        const timestamp = parsePtBrDateTime(article.createdAt);
        if (timestamp < bestTimestamp) {
            bestTimestamp = timestamp;
            bestIndex = index;
        }
    });

    return bestIndex;
}

function parsePtBrDateTime(value: string) {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return Number.POSITIVE_INFINITY;

    const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
    ).getTime();
}

function isTechnicalResourceArticle(article: TicketArticleItem) {
    const body = article.body.toLowerCase();
    return body.includes("recurso tecnico") || body.includes("recurso de diagn");
}

function stripHtml(value: string) {
    return markdownToPlainText(value);
}

function SidebarField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <div className="min-w-0 text-right wrap-break-word">{value}</div>
        </div>
    );
}

function EditableSidebarField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
            <div className="min-w-0">{children}</div>
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
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DetailDate({ value, fallback }: { value?: string | null; fallback: string }) {
    if (!value) return <span className="text-xs text-muted-foreground">{fallback}</span>;
    return <span className="font-mono text-xs text-muted-foreground">{formatTicketDateTime(value)}</span>;
}

function SupportPeopleFields({
    ticket,
    canManageTickets,
    isPending,
    supportUsers,
    developmentUsers,
    onUpdateOwners,
}: {
    ticket: TicketDetailsItem;
    canManageTickets: boolean;
    isPending: boolean;
    supportUsers: InternalUserOption[];
    developmentUsers: InternalUserOption[];
    onUpdateOwners: (payload: { supportOwnerUserId?: string; developmentOwnerUserId?: string }) => void;
}) {
    const supportName = ticket.operations?.supportOwnerName || "Nao definido";
    const supportId = ticket.operations?.supportOwnerUserId || "";
    const developerName = ticket.operations?.developmentOwnerName || "Nao definido";
    const developerId = ticket.operations?.developmentOwnerUserId || "";

    return (
        <>
            {canManageTickets ? (
                <EditableSidebarField label="Analista responsavel">
                    <OwnerSelect
                        value={supportId}
                        label={supportName}
                        users={supportUsers}
                        disabled={isPending}
                        emptyLabel="Sem analista responsavel"
                        searchPlaceholder="Pesquisar analista"
                        onChange={(value) => onUpdateOwners({ supportOwnerUserId: value })}
                    />
                </EditableSidebarField>
            ) : (
                <SidebarField
                    label="Analista responsavel"
                    value={
                        <span className="flex items-center justify-end gap-1.5 text-xs">
                            {supportId && <UserRound className="h-3 w-3 text-muted-foreground" />}
                            {supportName}
                        </span>
                    }
                />
            )}
            {canManageTickets ? (
                <EditableSidebarField label="Desenvolvedor">
                    <OwnerSelect
                        value={developerId}
                        label={developerName}
                        users={developmentUsers}
                        disabled={isPending}
                        emptyLabel="Sem desenvolvedor"
                        searchPlaceholder="Pesquisar desenvolvedor"
                        onChange={(value) => onUpdateOwners({ developmentOwnerUserId: value })}
                    />
                </EditableSidebarField>
            ) : (
                <SidebarField
                    label="Desenvolvedor"
                    value={
                        <span className="flex items-center justify-end gap-1.5 text-xs">
                            {developerId && <UserRound className="h-3 w-3 text-muted-foreground" />}
                            {developerName}
                        </span>
                    }
                />
            )}
        </>
    );
}

function getAssignableUsers(users: InternalUserOption[], team: "SUPORTE" | "DESENVOLVIMENTO") {
    return users.filter((user) => {
        if (!user?.id) return false;
        if (team === "DESENVOLVIMENTO") {
            return user.role === "DEVELOPER" || user.role === "ADMIN";
        }

        return user.role === "SUPORTE" || user.role === "ADMIN";
    });
}

function OwnerSelect({
    value,
    label,
    users,
    disabled,
    emptyLabel,
    searchPlaceholder,
    onChange,
}: {
    value: string;
    label: string;
    users: InternalUserOption[];
    disabled?: boolean;
    emptyLabel: string;
    searchPlaceholder: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (!open) setQuery("");
    }, [open]);

    const normalizedQuery = query.trim().toLowerCase();
    const filteredUsers = normalizedQuery
        ? users.filter((user) => `${user.name || ""} ${user.email} ${user.role}`.toLowerCase().includes(normalizedQuery))
        : users;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className="h-10 w-full justify-between rounded-md border-border/70 bg-background px-3 text-left text-sm font-medium shadow-none transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                    <span className="min-w-0 truncate">{label}</span>
                    <UserRound className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-(--radix-popover-trigger-width) p-0">
                <div className="border-b border-border/60 p-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="pl-9"
                        />
                    </div>
                </div>
                <ScrollArea className="max-h-72">
                    <div className="p-1.5">
                        <button
                            type="button"
                            className={cn(
                                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                                !value && "bg-primary/8 text-foreground",
                            )}
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                        >
                            <Check className={cn("h-4 w-4 shrink-0", !value ? "opacity-100 text-primary" : "opacity-0")} />
                            <span>{emptyLabel}</span>
                        </button>

                        {filteredUsers.map((user) => {
                            const isSelected = user.id === value;
                            const userLabel = user.name?.trim() || user.email;
                            return (
                                <button
                                    key={user.id}
                                    type="button"
                                    className={cn(
                                        "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                                        isSelected && "bg-primary/8 text-foreground",
                                    )}
                                    onClick={() => {
                                        onChange(user.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", isSelected ? "opacity-100 text-primary" : "opacity-0")} />
                                    <span className="min-w-0">
                                        <span className="block truncate">{userLabel}</span>
                                        <span className="block text-xs text-muted-foreground">{user.email}</span>
                                    </span>
                                </button>
                            );
                        })}

                        {filteredUsers.length === 0 ? (
                            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                Nenhum usuario encontrado.
                            </div>
                        ) : null}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}

function resolveOptionLabel(options: TicketModuleSettingsOption[], value?: string | null, fallback = "Nao definido") {
    const normalized = (value || "").trim();
    if (!normalized) return fallback;
    const option = options.find((item) => item.value.toLowerCase() === normalized.toLowerCase() || item.label.toLowerCase() === normalized.toLowerCase());
    return option ? formatModuleOptionLabel(option) : humanizeModuleHierarchyValue(normalized) || normalized;
}

function getCategoriesForTeam(categories: TicketModuleSettingsOption[], team?: string | null, currentCategory?: string | null) {
    const normalizedTeam = (team || "").trim().toUpperCase();
    const filtered = categories.filter((category) => !category.defaultTeam || category.defaultTeam === normalizedTeam);
    const options = filtered.length ? filtered : categories;
    const current = (currentCategory || "").trim();

    if (!current || options.some((category) => category.value.toLowerCase() === current.toLowerCase())) {
        return options;
    }

    const currentOption = categories.find((category) => category.value.toLowerCase() === current.toLowerCase());
    return currentOption ? [currentOption, ...options] : options;
}

function resolveCategoryForTeam(categories: TicketModuleSettingsOption[], team: string, currentCategory?: string | null) {
    const normalizedTeam = team.trim().toUpperCase();
    const teamOptions = categories.filter((category) => !category.defaultTeam || category.defaultTeam === normalizedTeam);
    const options = teamOptions.length ? teamOptions : categories;
    const current = (currentCategory || "").trim();
    const currentIsValid = Boolean(current) && options.some((category) => category.value.toLowerCase() === current.toLowerCase());

    if (currentIsValid) return current;
    return options[0]?.value || current;
}

function NativeSelectPill({
    id,
    value,
    label,
    disabled,
    options,
    onChange,
}: {
    id?: string;
    value: string;
    label: string;
    disabled?: boolean;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}) {
    if (disabled) {
        return <span className="text-xs">{label}</span>;
    }

    const emptyValue = "__empty__";
    const selectedValue = value || emptyValue;
    const normalizedOptions = options.some((option) => option.value === value)
        ? options
        : [{ value: selectedValue, label }, ...options];

    return (
        <Select
            value={selectedValue}
            onValueChange={(nextValue) => {
                if (nextValue === emptyValue || nextValue === value) return;
                onChange(nextValue);
            }}
        >
            <SelectTrigger
                id={id}
                aria-label={label}
                className="h-10 w-full rounded-md border-border/70 bg-background px-3 text-left text-sm font-medium text-foreground shadow-none transition-colors hover:border-primary/40 hover:bg-muted/30 focus:ring-2 focus:ring-primary/15"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" className="z-80 min-w-[var(--radix-select-trigger-width)] border-border/70 bg-popover text-popover-foreground">
                {normalizedOptions.map((option, index) => (
                    <SelectItem key={`${option.value}-${index}`} value={option.value} className="text-sm">
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function ClassificationDropdown({
    value,
    fallback,
    options,
    disabled,
    onChange,
}: {
    value?: string | null;
    fallback: string;
    options: TicketModuleSettingsOption[];
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    const currentLabel = resolveOptionLabel(options, value, fallback);
    const currentValue = (value || "").trim();

    if (disabled) {
        return <span className="text-xs">{currentLabel}</span>;
    }

    return (
        <NativeSelectPill
            value={currentValue}
            label={currentLabel}
            options={options.map((option) => ({ value: option.value, label: option.label }))}
            onChange={onChange}
            disabled={disabled}
        />
    );
}

function mapPriorityToLevel(priority: TicketModulePriority) {
    if (priority === "LOW") return 1;
    if (priority === "HIGH" || priority === "CRITICAL") return 3;
    return 2;
}

function mapLevelToPriority(priority: number): TicketModulePriority {
    if (priority === 1) return "LOW";
    if (priority === 3) return "HIGH";
    return "NORMAL";
}

function parsePriorityOption(option: TicketModuleSettingsPriority): TicketModulePriority {
    const value = `${option.id} ${option.value} ${option.label}`.toLowerCase();
    if (value.includes("low") || value.includes("baixa") || option.id === "1") return "LOW";
    if (value.includes("high") || value.includes("alta") || value.includes("urgent") || option.id === "3") return "HIGH";
    return "NORMAL";
}

function resolvePriorityLabel(priority: number, options: TicketModuleSettingsPriority[]) {
    const match = options.find((option) => mapPriorityToLevel(parsePriorityOption(option)) === priority);
    if (match) return match.label;
    if (priority === 3) return "Alta";
    if (priority === 1) return "Baixa";
    return "Normal";
}

function PriorityDropdown({
    priority,
    options,
    disabled,
    onChange,
}: {
    priority: number;
    options: TicketModuleSettingsPriority[];
    disabled?: boolean;
    onChange: (priority: TicketModulePriority) => void;
}) {
    const currentLabel = resolvePriorityLabel(priority, options);

    if (disabled) {
        return <span className="text-xs">{currentLabel}</span>;
    }

    return (
        <NativeSelectPill
            value={String(priority)}
            label={currentLabel}
            options={options.map((option) => ({
                value: String(mapPriorityToLevel(parsePriorityOption(option))),
                label: option.label,
            }))}
            disabled={disabled}
            onChange={(value) => {
                const selected = options.find((option) => String(mapPriorityToLevel(parsePriorityOption(option))) === value);
                onChange(selected ? parsePriorityOption(selected) : value === "3" ? "HIGH" : value === "1" ? "LOW" : "NORMAL");
            }}
        />
    );
}

const statusOptions: Array<{ value: TicketModuleStatus; label: string }> = [
    { value: "TRIAGE", label: "Triagem" },
    { value: "IN_PROGRESS", label: "Em desenvolvimento" },
    { value: "TESTING", label: "Em testes" },
    { value: "WAITING_CUSTOMER", label: "Pendente cliente" },
    { value: "WAITING_INTERNAL", label: "Aguardando interno" },
    { value: "RESOLVED", label: "Resolvido" },
];

function normalizeStatusValue(status?: string | null): TicketModuleStatus | null {
    const normalized = (status || "").trim().toLowerCase();
    if (normalized === "novo" || normalized === "new") return "NEW";
    if (normalized === "sem dono" || normalized === "unassigned") return "UNASSIGNED";
    if (normalized === "triagem" || normalized === "triage") return "TRIAGE";
    if (normalized === "em andamento" || normalized === "em desenvolvimento" || normalized === "in_progress") return "IN_PROGRESS";
    if (normalized === "em teste" || normalized === "em testes" || normalized === "testing") return "TESTING";
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
        return <span className="text-xs">{status || "Desconhecido"}</span>;
    }

    return (
        <NativeSelectPill
            value={current || ""}
            label={status || "Desconhecido"}
            options={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
            disabled={disabled}
            onChange={(value) => onChange(value as TicketModuleStatus)}
        />
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
            <SidebarField label="Vence em" value={<span className="font-mono text-xs text-muted-foreground">{formatTicketDateTime(ticket.slaResolutionDueAt)}</span>} />
        </section>
    );
}

const ticketDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
});

const ticketDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
});

function formatTicketDate(value?: string | null, fallback = "N/D") {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return ticketDateFormatter.format(parsed);
}

function formatTicketDateTime(value?: string | null, fallback = "N/D") {
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return ticketDateTimeFormatter.format(parsed);
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
