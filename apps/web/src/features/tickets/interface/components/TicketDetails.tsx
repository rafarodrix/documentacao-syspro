"use client";

import { useEffect, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    AlertCircle,
    ArrowLeft,
    Building2,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock3,
    ExternalLink,
    Hash,
    Sparkles,
    Timer,
    UserRound,
    Zap,
} from "lucide-react";
import { DEFAULT_TICKET_MODULE_SETTINGS, type TicketModulePriority, type TicketModuleSettings, type TicketModuleSettingsOption, type TicketModuleSettingsPriority, type TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import { updateTicketClassificationAction, updateTicketStatusAction } from "@/features/tickets/application/ticket-actions";
import { TicketChat } from "@/features/tickets/interface/components/TicketChat";
import { TicketFinalizeDialog } from "@/features/tickets/interface/components/TicketFinalizeDialog";
import { useTicketHotkeys } from "@/features/tickets/interface/hooks/use-ticket-hotkeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [ticketSettings, setTicketSettings] = useState<TicketModuleSettings>(DEFAULT_TICKET_MODULE_SETTINGS);
    const [localTeam, setLocalTeam] = useState(ticket?.operations?.currentTeam || "");
    const [localModule, setLocalModule] = useState(ticket?.operations?.module || "");
    const [localCategory, setLocalCategory] = useState(ticket?.operations?.category || "");
    const [localPriority, setLocalPriority] = useState(ticket?.priority);
    const backUrl = "/portal/tickets";
    const isClosedTicket = ticket ? isTicketClosed(ticket.status) : false;
    void currentUserId;

    useEffect(() => {
        let active = true;

        async function loadSettings() {
            try {
                const response = await fetch("/api/platform/settings/tickets", { cache: "no-store" });
                const payload = await response.json();
                if (active && payload?.success && payload?.data) {
                    setTicketSettings(payload.data);
                }
            } catch {
                if (active) setTicketSettings(DEFAULT_TICKET_MODULE_SETTINGS);
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
    }, [ticket?.id, ticket?.operations?.category, ticket?.operations?.currentTeam, ticket?.operations?.module, ticket?.priority]);

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

    const changeTeam = (team: string) => {
        if (!ticket || team === currentTeam) return;
        const nextCategory = resolveCategoryForTeam(ticketSettings.categories, team, currentCategory);

        startTransition(async () => {
            const res = await updateTicketClassificationAction(String(ticket.id), {
                team,
                ...(nextCategory !== currentCategory ? { category: nextCategory } : {}),
            });
            if (res.success) {
                setLocalTeam(team);
                if (nextCategory !== currentCategory) setLocalCategory(nextCategory);
                toast.success("Setor atualizado.");
            } else {
                toast.error(res.error || "Erro ao atualizar setor");
            }
            router.refresh();
        });
    };

    const changeClassification = (payload: { module?: string; category?: string; priority?: TicketModulePriority }) => {
        if (!ticket) return;
        startTransition(async () => {
            const res = await updateTicketClassificationAction(String(ticket.id), payload);
            if (res.success) {
                if (payload.module !== undefined) setLocalModule(payload.module);
                if (payload.category !== undefined) setLocalCategory(payload.category);
                if (payload.priority !== undefined) setLocalPriority(mapPriorityToLevel(payload.priority));
                toast.success("Classificacao atualizada.");
            } else {
                toast.error(res.error || "Erro ao atualizar classificacao");
            }
            router.refresh();
        });
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

    const timelineArticles = withTechnicalResourceArticles(articles || [], ticket);
    const currentTeam = localTeam || ticket.operations?.currentTeam || ticketSettings.defaultTeam || "SUPORTE";
    const currentModule = localModule || ticket.operations?.module || "";
    const currentCategory = localCategory || ticket.operations?.category || "";
    const currentPriority = localPriority ?? ticket.priority;
    const categoryOptions = getCategoriesForTeam(ticketSettings.categories, currentTeam, currentCategory);

    return (
        <div className="mx-auto max-w-360 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <h1 className="max-w-full wrap-break-word text-xl font-bold leading-snug tracking-tight text-foreground md:text-2xl">{ticket.title}</h1>
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
                            <div className="absolute left-0 top-0 h-0.5 w-full bg-linear-to-r from-transparent via-primary/40 to-transparent" />
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                                    Informacoes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <section className="space-y-3">
                                    <SidebarField
                                        label="Setor atual"
                                        value={
                                            <NativeSelectPill
                                                id="transfer-ticket-btn"
                                                value={currentTeam}
                                                label={resolveOptionLabel(ticketSettings.teams, currentTeam)}
                                                disabled={!isAdmin || isPending}
                                                options={ticketSettings.teams.map((team) => ({ value: team.value, label: team.label }))}
                                                onChange={changeTeam}
                                            />
                                        }
                                    />
                                    <SidebarField
                                        label="Categoria"
                                        value={
                                            <ClassificationDropdown
                                                value={currentCategory}
                                                fallback="Nao definida"
                                                options={categoryOptions}
                                                disabled={!isAdmin || isPending}
                                                onChange={(category) => changeClassification({ category })}
                                            />
                                        }
                                    />
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
                                    <SidebarField
                                        label="Prioridade"
                                        value={
                                            <PriorityDropdown
                                                priority={currentPriority}
                                                options={ticketSettings.priorities}
                                                disabled={!isAdmin || isPending}
                                                onChange={(priority) => changeClassification({ priority })}
                                            />
                                        }
                                    />
                                    <SidebarField
                                        label="Modulo"
                                        value={
                                            <ClassificationDropdown
                                                value={currentModule}
                                                fallback="Nao definido"
                                                options={ticketSettings.modules}
                                                disabled={!isAdmin || isPending}
                                                onChange={(module) => changeClassification({ module })}
                                            />
                                        }
                                    />
                                </section>

                                <Separator />
                                <SlaCompact ticket={ticket} isClosedTicket={isClosedTicket} />

                                <Separator />
                                <section className="space-y-3">
                                    <SupportPeopleFields ticket={ticket} currentTeam={currentTeam} />
                                    <SidebarField label="Resolucao" value={<DetailDate value={ticket.resolvedAt} fallback="Pendente" />} />
                                </section>

                                <Separator />
                                <section className="space-y-3">
                                    {ticket.operations?.openedByName && !isSameName(ticket.operations.openedByName, ticket.ownerName) && <SidebarField label="Aberto por" value={<span className="text-xs">{ticket.operations.openedByName}</span>} />}
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
    return ["resolvido", "resolved", "fechado", "arquivado", "archived", "finalizado"].some((item) => normalized.includes(item));
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
            <div className="min-w-0 text-right wrap-break-word">{value}</div>
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
    return <span className="font-mono text-xs text-muted-foreground">{new Date(value).toLocaleString("pt-BR")}</span>;
}

function isSameName(left?: string | null, right?: string | null) {
    return Boolean(left && right && left.trim().toLowerCase() === right.trim().toLowerCase());
}

function SupportPeopleFields({ ticket, currentTeam }: { ticket: TicketDetailsItem; currentTeam?: string | null }) {
    const team = (currentTeam || "").toUpperCase();
    const supportName = ticket.operations?.supportOwnerName || (team === "SUPORTE" ? ticket.ownerName : null);
    const developerName = ticket.operations?.developmentOwnerName || (team === "DESENVOLVIMENTO" ? ticket.ownerName : null);
    const currentOwnerName = ticket.ownerName || (ticket.ownerId ? `#${ticket.ownerId}` : null);
    const ownerIsAlreadyIdentified =
        isSameName(currentOwnerName, supportName) ||
        isSameName(currentOwnerName, developerName);

    return (
        <>
            <SidebarField
                label="Analista suporte"
                value={
                    <span className="flex items-center justify-end gap-1.5 text-xs">
                        {supportName && <UserRound className="h-3 w-3 text-muted-foreground" />}
                        {supportName || "Nao definido"}
                    </span>
                }
            />
            <SidebarField
                label="Desenvolvedor"
                value={
                    <span className="flex items-center justify-end gap-1.5 text-xs">
                        {developerName && <UserRound className="h-3 w-3 text-muted-foreground" />}
                        {developerName || "Nao definido"}
                    </span>
                }
            />
            {currentOwnerName && !ownerIsAlreadyIdentified && (
                <SidebarField
                    label="Responsavel atual"
                    value={
                        <span className="flex items-center justify-end gap-1.5 text-xs">
                            <UserRound className="h-3 w-3 text-muted-foreground" />
                            {currentOwnerName}
                        </span>
                    }
                />
            )}
        </>
    );
}

function resolveOptionLabel(options: TicketModuleSettingsOption[], value?: string | null, fallback = "Nao definido") {
    const normalized = (value || "").trim();
    if (!normalized) return fallback;
    const option = options.find((item) => item.value.toLowerCase() === normalized.toLowerCase() || item.label.toLowerCase() === normalized.toLowerCase());
    return option?.label || normalized;
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
                className="h-7 w-auto max-w-47.5 rounded-full border-border/70 bg-muted/20 px-2.5 py-0 text-right text-xs font-medium text-foreground shadow-none hover:border-primary/40 hover:bg-primary/10 focus:ring-2 focus:ring-primary/15 [&>svg]:ml-1.5 [&>svg]:h-3 [&>svg]:w-3"
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="z-80 min-w-42.5 border-border/70 bg-popover text-popover-foreground">
                {normalizedOptions.map((option, index) => (
                    <SelectItem key={`${option.value}-${index}`} value={option.value} className="text-xs">
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
