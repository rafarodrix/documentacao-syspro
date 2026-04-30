"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { DEFAULT_TICKET_MODULE_SETTINGS } from "@dosc-syspro/contracts/ticket";
import { useTicketChat } from "@/features/tickets/interface";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Bot, FileText, Headset, History, Loader2, MessageSquareText, Paperclip, Send, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketArticleItem, TicketMessagePagination } from "./types";
import { TicketRichTextEditor } from "@/features/tickets/interface/components/ticket-rich-text-editor";

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
        isPending, scrollRef, handleSend, isMe, isSystem,
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
        const html = body.trim().startsWith("<") ? body : `<p>${body}</p>`;
        setMessage((current) => `${current || ""}${current ? "<p><br></p>" : ""}${html}`);
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
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-4 py-3">
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
                        isDragging && "bg-primary/5",
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

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                            <FileText className="h-3.5 w-3.5" />
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
                            </div>

                            {files.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-1">
                                    {files.map((file, idx) => (
                                        <div key={`${file.name}-${idx}`} className="flex max-w-full items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs">
                                            <FileText className="h-3 w-3 shrink-0 text-primary" />
                                            <span className="max-w-40 truncate font-medium">{file.name}</span>
                                            <button onClick={() => removeFile(idx)} className="rounded-full p-0.5 transition-colors hover:bg-primary/20" type="button">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <div id="ticket-reply-input" className="min-w-0 flex-1" tabIndex={-1}>
                                    <TicketRichTextEditor
                                        value={message}
                                        onChange={setMessage}
                                        placeholder={composerIsInternal ? "Registre uma nota visivel apenas para a equipe..." : "Digite sua resposta ao cliente..."}
                                        minHeightClassName="min-h-28"
                                        compact
                                        showTemplates={false}
                                        templates={quickTemplates.map((template) => ({
                                            id: template.id,
                                            label: template.label,
                                            html: template.value.trim().startsWith("<") ? template.value : `<p>${template.value}</p>`,
                                        }))}
                                    />
                                </div>

                                <div className="flex shrink-0 flex-col gap-2">
                                    <input type="file" multiple hidden ref={fileInputRef} onChange={(event) => addFiles(event.target.files)} />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-10 w-10 rounded-lg border-border/60 hover:bg-muted"
                                        title="Anexar arquivos"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        onClick={() => handleSend(messageMode)}
                                        disabled={isPending || (!message.trim() && files.length === 0)}
                                        size="default"
                                        className="h-10 min-w-28 rounded-lg shadow"
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

function isHistoryArticle(article: TicketArticleItem, isSystem: (from: string) => boolean) {
    return (article.messageType === "SYSTEM_EVENT" || isSystem(article.from)) && !isTechnicalResourceArticle(article);
}

function isTechnicalResourceArticle(article: TicketArticleItem) {
    const body = article.body.toLowerCase();
    return body.includes("recurso tecnico") || body.includes("recurso de diagnostico") || body.includes("recurso de diagnóstico");
}

const ALLOWED_HTML_TAGS = new Set([
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
]);

const GLOBAL_ALLOWED_ATTRIBUTES = new Set(["class"]);
const TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
    a: new Set(["href", "target", "rel"]),
    img: new Set(["src", "alt", "title"]),
};

function sanitizeArticleHtml(html: string) {
    if (!html.trim() || typeof window === "undefined") return html;

    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");

    const sanitizeNode = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const tagName = element.tagName.toLowerCase();

            if (!ALLOWED_HTML_TAGS.has(tagName)) {
                const fragment = document.createDocumentFragment();
                while (element.firstChild) {
                    fragment.appendChild(element.firstChild);
                }
                element.replaceWith(fragment);
                fragment.childNodes.forEach(sanitizeNode);
                return;
            }

            const allowedAttributes = new Set([
                ...GLOBAL_ALLOWED_ATTRIBUTES,
                ...(TAG_ALLOWED_ATTRIBUTES[tagName] ?? new Set<string>()),
            ]);

            for (const attribute of Array.from(element.attributes)) {
                const attributeName = attribute.name.toLowerCase();
                const attributeValue = attribute.value.trim();

                if (attributeName.startsWith("on")) {
                    element.removeAttribute(attribute.name);
                    continue;
                }

                if (!allowedAttributes.has(attributeName)) {
                    element.removeAttribute(attribute.name);
                    continue;
                }

                if ((attributeName === "href" || attributeName === "src") && !isSafeUrl(attributeValue)) {
                    element.removeAttribute(attribute.name);
                    continue;
                }

                if (tagName === "a" && attributeName === "target") {
                    element.setAttribute("target", "_blank");
                }

                if (tagName === "a" && attributeName === "href") {
                    element.setAttribute("rel", "noopener noreferrer nofollow");
                }
            }
        }

        node.childNodes.forEach(sanitizeNode);
    };

    document.body.childNodes.forEach(sanitizeNode);
    return document.body.innerHTML;
}

function isSafeUrl(value: string) {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith("javascript:")) return false;
    if (normalized.startsWith("vbscript:")) return false;
    if (normalized.startsWith("data:text/html")) return false;
    return true;
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

    return (
        <div ref={containerRef} className="w-full">
            <ScrollArea className="h-130 w-full max-w-full overflow-hidden bg-[hsl(var(--muted))]/20 dark:bg-[hsl(var(--background))]/40 **:data-radix-scroll-area-viewport:overflow-x-hidden">
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

                    {articles.map((article) => {
                        const technicalResource = isTechnicalResourceArticle(article);
                        const messageIsMe = !technicalResource && (article.sender === "Agent" || isMe(article.from));
                        const messageIsSystem = (isSystem(article.from) || article.messageType === "SYSTEM_EVENT") && !technicalResource;

                        if (messageIsSystem) {
                            const historyEvent = parseHistoryEvent(article.body);
                            return (
                                <div key={article.id} className="flex min-w-0 max-w-full justify-center overflow-hidden">
                                    <div className="w-full max-w-2xl rounded-2xl border border-border/70 bg-background/90 p-3 shadow-sm">
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <Bot className="h-3.5 w-3.5 shrink-0" />
                                            <span className="min-w-0 flex-1 wrap-anywhere">{historyEvent.title}</span>
                                            <span className="shrink-0 opacity-70">{article.createdAt}</span>
                                        </div>
                                        {historyEvent.details.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {historyEvent.details.map((detail, index) => (
                                                    <div key={`${article.id}-detail-${index}`} className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2 text-xs text-foreground">
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

                        return (
                            <div key={article.id} className={cn("grid min-w-0 max-w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-3", messageIsMe && "grid-cols-[minmax(0,1fr)_2.25rem]")}>
                                {!messageIsMe && (
                                    <Avatar className="h-9 w-9 shrink-0 border shadow-sm">
                                        <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">
                                            <Headset className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                                <div className={cn("flex min-w-0 max-w-full flex-col", messageIsMe && "items-end")}>
                                    <div className={cn("mb-1 flex w-full max-w-full flex-wrap items-center gap-2 px-1", messageIsMe && "justify-end")}>
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
                                            "prose prose-sm min-w-0 w-fit max-w-[min(100%,42rem)]! rounded-2xl p-3 text-sm shadow-sm wrap-anywhere **:max-w-full **:wrap-anywhere",
                                            "[&_p]:whitespace-normal [&_p]:wrap-break-word [&_span]:wrap-break-word [&_strong]:wrap-break-word",
                                            "prose-pre:max-w-full prose-pre:overflow-x-hidden prose-pre:rounded-lg prose-pre:border prose-pre:bg-black prose-pre:p-3 prose-pre:text-white prose-pre:whitespace-pre-wrap",
                                            "prose-a:break-all prose-code:break-all prose-code:whitespace-pre-wrap",
                                            "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-border/70",
                                            "[&_thead]:bg-muted/60 [&_tbody_tr:nth-child(even)]:bg-muted/25 [&_tbody_tr:hover]:bg-muted/35",
                                            "[&_th]:border [&_th]:border-border/60 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:align-top [&_th]:font-semibold [&_th]:text-foreground",
                                            "[&_td]:border [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:text-foreground",
                                            "[&_th_p]:m-0 [&_td_p]:m-0 [&_li_p]:m-0",
                                            article.isInternal
                                                ? "rounded-tl-sm border border-amber-200/60 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 dark:prose-invert"
                                                : messageIsMe
                                                    ? "rounded-tr-sm bg-primary text-primary-foreground **:text-primary-foreground"
                                                    : "rounded-tl-sm border border-border bg-secondary text-foreground dark:prose-invert",
                                        )}
                                        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.body) }}
                                    />
                                </div>

                                {messageIsMe && (
                                    <Avatar className="h-9 w-9 shrink-0 border shadow-sm">
                                        <AvatarFallback className="bg-primary/20 text-primary">
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

function stripHtml(value: string) {
    return value.replace(/<[^>]*>?/gm, "");
}

function parseHistoryEvent(value: string) {
    const plain = stripHtml(value).replace(/\r/g, "");
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
