"use client";

import { useTicketChat } from "@/hooks/use-ticket-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, User, Headset, Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Article {
    id: number;
    body: string;
    from: string;
    createdAt: string;
    isInternal: boolean;
}

interface TicketChatProps {
    ticketId: string;
    articles: Article[];
    ticketStatus: string;
}

export function TicketChat({ ticketId, articles, ticketStatus }: TicketChatProps) {
    const {
        message,
        setMessage,
        isPending,
        scrollRef,
        handleSend,
        isMe,
        isSystem,
    } = useTicketChat(ticketId, articles);

    const isClosed = [
        "closed",
        "merged",
        "fechado",
        "resolvido",
        "finalizado",
        "recusado",
    ].includes((ticketStatus || "").toLowerCase());

    return (
        <div className="flex flex-col h-[600px] border rounded-xl shadow-sm bg-background overflow-hidden">

            {/* ÁREA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-[hsl(var(--muted))]/20 dark:bg-[hsl(var(--background))]/40 transition-colors">
                {articles.map((article) => {
                    const messageIsMe = isMe(article.from);
                    const messageIsSystem = isSystem(article.from);

                    // MENSAGEM DO SISTEMA
                    if (messageIsSystem) {
                        return (
                            <div key={article.id} className="flex justify-center">
                                <span className="text-xs px-4 py-1.5 rounded-full bg-muted text-muted-foreground border shadow-sm flex items-center gap-2">
                                    <Bot className="h-3 w-3" />
                                    {article.body.replace(/<[^>]*>?/gm, "")}
                                    <span className="opacity-70">• {article.createdAt}</span>
                                </span>
                            </div>
                        );
                    }

                    // CHAT NORMAL
                    return (
                        <div
                            key={article.id}
                            className={cn(
                                "flex gap-3 max-w-[90%]",
                                messageIsMe ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            {/* AVATAR */}
                            <Avatar className="h-9 w-9 border shadow-sm">
                                <AvatarFallback
                                    className={cn(
                                        messageIsMe
                                            ? "bg-primary/20 text-primary"
                                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200"
                                    )}
                                >
                                    {messageIsMe ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>

                            {/* CONTEÚDO */}
                            <div className={cn("flex flex-col min-w-0", messageIsMe && "items-end")}>

                                {/* Nome + Data */}
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-xs font-medium truncate max-w-[200px]">
                                        {messageIsMe ? "Você" : article.from.split("<")[0]}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{article.createdAt}</span>
                                </div>

                                {/* BALÃO */}
                                <div
                                    className={cn(
                                        "rounded-2xl p-3 text-sm shadow-sm break-words prose prose-sm max-w-none",
                                        "prose-pre:bg-black prose-pre:text-white prose-pre:p-3 prose-pre:rounded-lg prose-pre:border",
                                        messageIsMe
                                            ? "bg-primary text-primary-foreground rounded-tr-sm [&_*]:text-primary-foreground"
                                            : "bg-secondary text-foreground border border-border rounded-tl-sm dark:prose-invert"
                                    )}
                                    dangerouslySetInnerHTML={{ __html: article.body }}
                                />
                            </div>
                        </div>
                    );
                })}

                <div ref={scrollRef} className="h-px w-full" />
            </div>

            {/* ÁREA DE INPUT */}
            <div className="p-4 border-t bg-background">
                {isClosed ? (
                    <div className="py-6 text-center border border-dashed rounded-xl bg-muted/30 flex flex-col items-center">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        <p className="mt-2 text-sm font-medium">Chamado Encerrado</p>
                        <p className="text-xs text-muted-foreground">Não é possível enviar mensagens.</p>
                    </div>
                ) : (
                    <div className="flex gap-3 items-end relative">
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua resposta..."
                            className="min-h-[50px] max-h-[150px] pr-14 rounded-xl resize-none bg-muted/30"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />

                        <Button
                            onClick={handleSend}
                            disabled={isPending || !message.trim()}
                            size="icon"
                            className="absolute right-2 bottom-2 h-10 w-10 rounded-lg shadow"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
            </div>

        </div>
    );
}
