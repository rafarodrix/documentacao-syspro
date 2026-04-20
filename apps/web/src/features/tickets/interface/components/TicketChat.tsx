"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import dynamic from "next/dynamic";
import { DEFAULT_TICKET_MODULE_SETTINGS, type TicketModuleSettings } from "@dosc-syspro/contracts/ticket";
import { useTicketChat } from "@/features/tickets/interface";
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
import type { TicketArticleItem } from "./types";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), {
    ssr: false,
    loading: () => <div className="h-24 w-full animate-pulse rounded-lg border border-border/50 bg-muted/20" />,
});

interface TicketChatProps {
    ticketId: string;
    articles: TicketArticleItem[];
    ticketStatus: string;
}

export function TicketChat({ ticketId, articles, ticketStatus }: TicketChatProps) {
    const {
        message, setMessage, files, addFiles, removeFile,
        isPending, scrollRef, handleSend, isMe, isSystem,
    } = useTicketChat(ticketId, articles);

    const [messageMode, setMessageMode] = useState<"PUBLIC" | "INTERNAL">("PUBLIC");
    const [isDragging, setIsDragging] = useState(false);
    const [quickTemplates, setQuickTemplates] = useState(DEFAULT_TICKET_MODULE_SETTINGS.quickReplyTemplates);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isClosed = ["closed", "merged", "fechado", "resolvido", "finalizado", "recusado"].includes(
        (ticketStatus || "").toLowerCase(),
    );

    const historyArticles = articles.filter((article) => isHistoryArticle(article, isSystem));
    const conversationArticles = articles.filter((article) => !isHistoryArticle(article, isSystem));
    const composerIsInternal = messageMode === "INTERNAL";

    useEffect(() => {
        let active = true;

        fetch("/api/platform/settings/tickets", { method: "GET", cache: "no-store" })
            .then(async (response) => {
                const json = (await response.json()) as { success?: boolean; data?: TicketModuleSettings };
                if (!active || !json.success || !json.data?.quickReplyTemplates) return;
                setQuickTemplates(json.data.quickReplyTemplates);
            })
            .catch(() => undefined);

        return () => {
            active = false;
        };
    }, []);

    const insertTemplate = (body: string) => {
        const html = body.trim().startsWith("<") ? body : `<p>${body}</p>`;
        setMessage((current) => `${current || ""}${current ? "<p><br></p>" : ""}${html}`);
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
                        />
                    </TabsContent>

                    <TabsContent value="history" className="m-0">
                        <Timeline
                            articles={historyArticles}
                            emptyLabel="Nenhum evento de historico registrado."
                            isMe={isMe}
                            isSystem={isSystem}
                            scrollRef={undefined}
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
                                    <ReactQuill
                                        theme="snow"
                                        value={message}
                                        onChange={setMessage}
                                        placeholder={composerIsInternal ? "Registre uma nota visivel apenas para a equipe..." : "Digite sua resposta ao cliente..."}
                                        modules={{
                                            toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["clean"]],
                                        }}
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
                                        size="icon"
                                        className="h-10 w-10 rounded-lg shadow"
                                        title={composerIsInternal ? "Registrar nota interna" : "Enviar resposta ao cliente"}
                                    >
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

function Timeline({
    articles,
    emptyLabel,
    isMe,
    isSystem,
    scrollRef,
}: {
    articles: TicketArticleItem[];
    emptyLabel: string;
    isMe: (from: string) => boolean;
    isSystem: (from: string) => boolean;
    scrollRef?: RefObject<HTMLDivElement | null>;
}) {
    return (
        <ScrollArea className="h-130 w-full max-w-full overflow-hidden bg-[hsl(var(--muted))]/20 dark:bg-[hsl(var(--background))]/40 **:data-radix-scroll-area-viewport:overflow-x-hidden">
            <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden p-4">
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
                        return (
                            <div key={article.id} className="flex min-w-0 max-w-full justify-center overflow-hidden">
                                <span className="flex min-w-0 max-w-full items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-xs text-muted-foreground shadow-sm wrap-anywhere">
                                    <Bot className="h-3 w-3 shrink-0" />
                                    <span className="min-w-0 wrap-anywhere">{stripHtml(article.body)}</span>
                                    <span className="shrink-0 opacity-70">* {article.createdAt}</span>
                                </span>
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
                                        article.isInternal
                                            ? "rounded-tl-sm border border-amber-200/60 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 dark:prose-invert"
                                            : messageIsMe
                                                ? "rounded-tr-sm bg-primary text-primary-foreground **:text-primary-foreground"
                                                : "rounded-tl-sm border border-border bg-secondary text-foreground dark:prose-invert",
                                    )}
                                    dangerouslySetInnerHTML={{ __html: article.body }}
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
    );
}

function stripHtml(value: string) {
    return value.replace(/<[^>]*>?/gm, "");
}
