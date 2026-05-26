"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { DEFAULT_TICKET_MODULE_SETTINGS, TICKET_ATTACHMENT_ACCEPT_ATTRIBUTE } from "@dosc-syspro/contracts/ticket";
import { useTicketChat } from "@/features/tickets/interface";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { Avatar, AvatarFallback, Button, Card, CardContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, ScrollArea, Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { AlertCircle, Bot, Film, Headset, History, ImageIcon, Loader2, MessageSquareText, Mic, Paperclip, Send, User, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketArticleItem, TicketMessagePagination } from "./ticket-view.types";
import { TicketRichTextEditor } from "@/features/tickets/interface/components/ticket-rich-text-editor";
import { TicketMessageContent } from "@/features/tickets/interface/components/ticket-message-content";
import {
    appendMarkdownBlock,
    markdownToPlainText,
    normalizeTicketMarkdownInput,
} from "@dosc-syspro/tickets-domain";
import { findOpeningArticleIndex } from "./ticket-details.helpers";

interface TicketChatProps {
    ticketId: string;
    articles: TicketArticleItem[];
    ticketStatus: string;
    messagePagination?: TicketMessagePagination;
    isLoadingOlder?: boolean;
    onLoadOlder?: () => Promise<boolean> | boolean;
}

export function TicketChat({ ticketId, articles, ticketStatus, messagePagination, isLoadingOlder = false, onLoadOlder }: TicketChatProps) {
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const pendingScrollRestoreRef = useRef<{ viewport: HTMLElement; scrollHeight: number; scrollTop: number } | null>(null);
    const {
        message, setMessage, files, addFiles, removeFile,
        handlePaste, isPending, scrollRef, handleSend, isMe, isSystem,
    } = useTicketChat(ticketId, articles, autoScrollEnabled);

    const [messageMode, setMessageMode] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
    const [isDragging, setIsDragging] = useState(false);
    const [quickTemplates, setQuickTemplates] = useState(DEFAULT_TICKET_MODULE_SETTINGS.quickReplyTemplates);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const ticketSettings = useTicketModuleSettings();
    const isClosed = ["closed", "merged", "fechado", "resolvido", "finalizado", "recusado"].includes(
        (ticketStatus || "").toLowerCase(),
    );

    const historyArticles = articles.filter((article) => isHistoryArticle(article, isSystem));
    const conversationArticles = articles.filter((article) => !isHistoryArticle(article, isSystem));
    const composerIsInternal = messageMode === "INTERNAL";
    const hasOlderArticles = Boolean(messagePagination?.hasNextPage);

    useEffect(() => {
        setQuickTemplates(ticketSettings.quickReplyTemplates);
    }, [ticketSettings]);

    useEffect(() => {
        const pendingRestore = pendingScrollRestoreRef.current;
        if (!pendingRestore) return;

        requestAnimationFrame(() => {
            const heightDelta = pendingRestore.viewport.scrollHeight - pendingRestore.scrollHeight;
            pendingRestore.viewport.scrollTop = pendingRestore.scrollTop + Math.max(0, heightDelta);
            pendingScrollRestoreRef.current = null;
            setAutoScrollEnabled(true);
        });
    }, [articles]);

    const insertTemplate = (body: string) => {
        setMessage((current) => appendMarkdownBlock(current, normalizeTicketMarkdownInput(body)));
    };

    const handleLoadOlder = async (container: HTMLDivElement | null) => {
        if (!onLoadOlder || !container || isLoadingOlder || !hasOlderArticles) {
            return;
        }

        const viewport = container.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (viewport) {
            pendingScrollRestoreRef.current = {
                viewport,
                scrollHeight: viewport.scrollHeight,
                scrollTop: viewport.scrollTop,
            };
            setAutoScrollEnabled(false);
        }

        const loaded = await onLoadOlder();
        if (!loaded) {
            pendingScrollRestoreRef.current = null;
            setAutoScrollEnabled(true);
        }
    };

    return (
        <Card className="w-full max-w-full overflow-hidden border-border/60">
            <CardContent className="p-0">
                <Tabs defaultValue="conversation" className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-background px-4 py-3">
                        <TabsList className="h-8">
                            <TabsTrigger value="conversation" className="h-6 gap-1.5 px-2 text-xs">
                                <MessageSquareText className="h-3.5 w-3.5" />
                                Conversa
                            </TabsTrigger>
                            <TabsTrigger value="history" className="h-6 gap-1.5 px-2 text-xs">
                                <History className="h-3.5 w-3.5" />
                                Historico
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="conversation" className="m-0">
                        <Timeline
                            articles={conversationArticles}
                            emptyLabel="Nenhuma mensagem de conversa registrada."
                            isMe={isMe}
                            isSystem={isSystem}
                            scrollRef={scrollRef}
                            hasOlderArticles={hasOlderArticles}
                            isLoadingOlder={isLoadingOlder}
                            onLoadOlder={handleLoadOlder}
                        />
                    </TabsContent>

                    <TabsContent value="history" className="m-0">
                        <Timeline
                            articles={historyArticles}
                            emptyLabel="Nenhum evento de historico registrado."
                            isMe={isMe}
                            isSystem={isSystem}
                            scrollRef={undefined}
                            hasOlderArticles={hasOlderArticles}
                            isLoadingOlder={isLoadingOlder}
                            onLoadOlder={handleLoadOlder}
                        />
                    </TabsContent>
                </Tabs>

                <div
                    className={cn(
                        "border-t bg-background p-4 transition-colors",
                        composerIsInternal && "bg-amber-50/70 dark:bg-amber-950/20",
                        isDragging && "bg-muted/10",
                    )}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                        addFiles(event.dataTransfer.files);
                    }}
                >
                    {isClosed ? (
                        <div className="flex flex-col items-center rounded-lg border border-dashed bg-muted/30 py-6 text-center">
                            <AlertCircle className="h-5 w-5 text-muted-foreground" />
                            <p className="mt-2 text-sm font-medium">Chamado encerrado</p>
                            <p className="text-xs text-muted-foreground">Nao e possivel enviar mensagens.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Tabs value={messageMode} onValueChange={(value) => setMessageMode(value as "PUBLIC" | "INTERNAL")}>
                                    <TabsList className={cn("h-8", composerIsInternal && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200")}>
                                        <TabsTrigger value="PUBLIC" className="h-6 px-2 text-xs">Resposta ao Cliente</TabsTrigger>
                                        <TabsTrigger value="INTERNAL" className="h-6 px-2 text-xs">Nota Interna</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {files.length > 0 && (
                                <div className="grid gap-2 px-1 sm:grid-cols-2 xl:grid-cols-3">
                                    {files.map((file, idx) => (
                                        <ComposerAttachmentPreview
                                            key={`${file.name}-${idx}`}
                                            file={file}
                                            onRemove={() => removeFile(idx)}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <div id="ticket-reply-input" className="min-w-0 flex-1" tabIndex={-1}>
                                    <TicketRichTextEditor
                                        value={message}
                                        onChange={setMessage}
                                        onPaste={handlePaste}
                                        placeholder={composerIsInternal ? "Registre uma nota visivel apenas para a equipe..." : "Digite sua resposta ao cliente..."}
                                        minHeightClassName="min-h-28"
                                        compact
                                        showTemplates={false}
                                        previewMode={messageMode}
                                        templates={quickTemplates.map((template) => ({
                                            id: template.id,
                                            label: template.label,
                                            value: template.value,
                                        }))}
                                    />
                                </div>

                                <div className="flex shrink-0 flex-col gap-2 self-start">
                                    <input
                                        type="file"
                                        multiple
                                        hidden
                                        ref={fileInputRef}
                                        accept={TICKET_ATTACHMENT_ACCEPT_ATTRIBUTE}
                                        onChange={(event) => addFiles(event.target.files)}
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="default"
                                                className="h-9 min-w-32 justify-start rounded-lg border-border/60 bg-muted/35 text-foreground hover:bg-muted/60"
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                Templates
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64">
                                            <DropdownMenuLabel className="text-xs">Respostas rapidas</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {quickTemplates.map((template) => (
                                                <DropdownMenuItem key={template.id} className="text-xs" onClick={() => insertTemplate(template.value)}>
                                                    {template.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="default"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-9 min-w-32 justify-start rounded-lg border-border/60 bg-muted/35 text-foreground hover:bg-muted/60"
                                        title="Anexar arquivos"
                                    >
                                        <Paperclip className="mr-2 h-4 w-4" />
                                        Anexo
                                    </Button>

                                    <Button
                                        onClick={() => handleSend(messageMode)}
                                        disabled={isPending || (!message.trim() && files.length === 0)}
                                        size="default"
                                        className="h-9 min-w-32 rounded-lg"
                                        title={composerIsInternal ? "Registrar nota interna" : "Enviar resposta ao cliente"}
                                    >
                                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        {composerIsInternal ? "Registrar" : "Enviar"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function ComposerAttachmentPreview({
    file,
    onRemove,
}: {
    file: File;
    onRemove: () => void;
}) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const isImage = file.type.startsWith("image/");

    useEffect(() => {
        if (!isImage) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [file, isImage]);

    return (
        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border/60 bg-muted/10 p-2.5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background">
                {isImage && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
                ) : (
                    <AttachmentTypeIcon mimeType={file.type} className="h-5 w-5 text-muted-foreground" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{file.name}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                    {formatTicketAttachmentSize(file.size)}
                    {file.type ? ` - ${file.type}` : ""}
                </div>
            </div>
            <button onClick={onRemove} className="rounded-full p-1 transition-colors hover:bg-muted/70" type="button" aria-label={`Remover ${file.name}`}>
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

function isHistoryArticle(article: TicketArticleItem, isSystem: (from: string) => boolean) {
    return (article.messageType === "SYSTEM_EVENT" || isSystem(article.from)) && !isTechnicalResourceArticle(article);
}

function isTechnicalResourceArticle(article: TicketArticleItem) {
    const body = article.body.toLowerCase();
    return body.includes("recurso tecnico") || body.includes("recurso de diagnostico") || body.includes("recurso de diagnóstico");
}

function Timeline({
    articles,
    emptyLabel,
    isMe,
    isSystem,
    scrollRef,
    hasOlderArticles,
    isLoadingOlder,
    onLoadOlder,
}: {
    articles: TicketArticleItem[];
    emptyLabel: string;
    isMe: (from: string) => boolean;
    isSystem: (from: string) => boolean;
    scrollRef?: RefObject<HTMLDivElement | null>;
    hasOlderArticles: boolean;
    isLoadingOlder: boolean;
    onLoadOlder: (container: HTMLDivElement | null) => Promise<void | boolean>;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const openingIndex = findOpeningArticleIndex(articles);

    return (
        <div ref={containerRef} className="w-full">
            <ScrollArea className="h-130 w-full max-w-full overflow-hidden bg-[hsl(var(--muted))]/10 dark:bg-[hsl(var(--background))]/40 **:data-radix-scroll-area-viewport:overflow-x-hidden">
                <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-4">
                    {hasOlderArticles && (
                        <div className="flex justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full text-xs"
                                disabled={isLoadingOlder}
                                onClick={() => void onLoadOlder(containerRef.current)}
                            >
                                {isLoadingOlder ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                                Carregar mensagens anteriores
                            </Button>
                        </div>
                    )}

                    {articles.length === 0 && (
                        <div className="rounded-lg border border-dashed bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
                            {emptyLabel}
                        </div>
                    )}

                    {articles.map((article, index) => {
                        const technicalResource = isTechnicalResourceArticle(article);
                        const isOpening = index === openingIndex;
                        const messageIsMe = !technicalResource && (article.sender === "Agent" || isMe(article.from));
                        const messageIsSystem = (isSystem(article.from) || article.messageType === "SYSTEM_EVENT") && !technicalResource;

                        if (messageIsSystem) {
                            const historyEvent = parseHistoryEvent(article.body);
                            return (
                                <div key={article.id} className="flex min-w-0 max-w-full justify-center overflow-hidden">
                                    <div className="w-full max-w-2xl rounded-2xl border border-border/70 bg-background/90 p-3 shadow-none">
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <Bot className="h-3.5 w-3.5 shrink-0" />
                                            <span className="min-w-0 flex-1 wrap-anywhere">{historyEvent.title}</span>
                                            <span className="shrink-0 opacity-70">{article.createdAt}</span>
                                        </div>
                                        {historyEvent.details.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {historyEvent.details.map((detail, indexDetail) => (
                                                    <div key={`${article.id}-detail-${indexDetail}`} className="rounded-xl border border-border/60 bg-muted/15 px-3 py-2 text-xs text-foreground">
                                                        {detail.includes("->") ? (
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-medium text-muted-foreground">{detail.split("->")[0]?.trim()}</span>
                                                                <span className="font-mono text-[11px] text-foreground">{detail.split("->")[1] ? `-> ${detail.split("->")[1]?.trim()}` : ""}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="wrap-anywhere">{detail}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        const alignRight = messageIsMe && !isOpening;

                        return (
                            <div key={article.id} className={cn("grid min-w-0 max-w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-3", alignRight && "grid-cols-[minmax(0,1fr)_2.25rem]")}>
                                {!alignRight && (
                                    <Avatar className="h-9 w-9 shrink-0 border shadow-none">
                                        <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">
                                            <Headset className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                                <div className={cn("flex min-w-0 max-w-full flex-col", alignRight && "items-end")}>
                                    <div className={cn("mb-1 flex w-full max-w-full flex-wrap items-center gap-2 px-1", alignRight && "justify-end")}>
                                        <span className="min-w-0 max-w-55 truncate text-xs font-medium">
                                            {messageIsMe ? "Voce" : article.from.split("<")[0]}
                                        </span>
                                        {article.isInternal && (
                                            <span className="max-w-full wrap-break-word rounded bg-amber-100 px-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                                                Nota Interna
                                            </span>
                                        )}
                                        <span className="shrink-0 text-[10px] text-muted-foreground">{article.createdAt}</span>
                                    </div>

                                    <div
                                        className={cn(
                                            "min-w-0 rounded-2xl p-3 text-sm shadow-none wrap-anywhere",
                                            isOpening ? "w-full max-w-full!" : "w-fit max-w-[min(100%,42rem)]!",
                                            article.isInternal
                                                ? "rounded-tl-sm border border-amber-200/60 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 dark:prose-invert"
                                                : isOpening
                                                    ? "rounded-tl-sm border border-border bg-card p-4 text-foreground dark:prose-invert"
                                                    : messageIsMe
                                                        ? "rounded-tr-sm bg-muted text-foreground dark:prose-invert"
                                                        : "rounded-tl-sm border border-border bg-secondary text-foreground dark:prose-invert",
                                        )}
                                    >
                                        <TicketMessageContent
                                            body={article.body}
                                        />
                                        {article.attachments && article.attachments.length > 0 && (
                                            <div className="mt-3 space-y-3">
                                                {article.attachments.map((attachment) => (
                                                    <TicketAttachmentPreview
                                                        key={attachment.id}
                                                        attachment={attachment}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {alignRight && (
                                    <Avatar className="h-9 w-9 shrink-0 border shadow-none">
                                        <AvatarFallback className="bg-muted text-foreground">
                                            <User className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        );
                    })}

                    {scrollRef && <div ref={scrollRef} className="h-px w-full" />}
                </div>
            </ScrollArea>
        </div>
    );
}

function TicketAttachmentPreview({
    attachment,
}: {
    attachment: NonNullable<TicketArticleItem["attachments"]>[number];
}) {
    const isImage = attachment.mimeType.startsWith("image/");

    return (
        <div className="space-y-2">
            {isImage && attachment.url ? (
                <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={attachment.url}
                        alt={attachment.filename}
                        className="max-h-128 w-auto max-w-full rounded-xl border border-border/60 bg-background object-contain"
                    />
                </a>
            ) : null}

            <a
                href={attachment.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                    "flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs text-foreground transition-colors hover:bg-background",
                    !attachment.url && "pointer-events-none opacity-60",
                )}
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/20 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{attachment.filename}</span>
                    <span className="block text-[11px] text-muted-foreground">
                        {formatTicketAttachmentSize(attachment.fileSize)} - {attachment.storageBackend === "R2" ? "Storage" : "Banco"}
                    </span>
                </span>
            </a>
        </div>
    );
}

function AttachmentTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
    if (mimeType.startsWith("image/")) {
        return <ImageIcon className={className} />;
    }
    if (mimeType.startsWith("audio/")) {
        return <Mic className={className} />;
    }
    if (mimeType.startsWith("video/")) {
        return <Film className={className} />;
    }
    return <FileText className={className} />;
}

function formatTicketAttachmentSize(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${bytes} B`;
}

function parseHistoryEvent(value: string) {
    const plain = markdownToPlainText(value).replace(/\r/g, "");
    const lines = plain
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) {
        return { title: "Evento do sistema", details: [] as string[] };
    }

    return {
        title: lines[0],
        details: lines.slice(1),
    };
}
