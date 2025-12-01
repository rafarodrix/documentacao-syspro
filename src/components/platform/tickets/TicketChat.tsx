"use client";

import { useTicketChat } from "@/hooks/use-ticket-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, User, Headset, Bot } from "lucide-react";
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
    // 1. Toda a lógica complexa vem do Hook
    const {
        message, setMessage, isPending, scrollRef, handleSend, isMe, isSystem
    } = useTicketChat(ticketId, articles);

    const isClosed = ['closed', 'merged', 'fechado', 'resolvido', 'finalizado'].includes((ticketStatus || '').toLowerCase());

    return (
        <div className="flex flex-col h-[600px] border rounded-xl bg-muted/10 overflow-hidden shadow-sm">

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-background/50">
                {articles.map((article) => {
                    const messageIsMe = isMe(article.from);
                    const messageIsSystem = isSystem(article.from);

                    // MENSAGEM DO SISTEMA (Centralizada)
                    if (messageIsSystem) {
                        return (
                            <div key={article.id} className="flex justify-center my-4">
                                <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground flex items-center gap-2 border border-border/50">
                                    <Bot className="h-3 w-3" />
                                    {/* Remove tags HTML para log limpo */}
                                    {article.body.replace(/<[^>]*>?/gm, '')} • {article.createdAt}
                                </span>
                            </div>
                        );
                    }

                    // MENSAGEM DE USUÁRIO (Direita/Esquerda)
                    return (
                        <div
                            key={article.id}
                            className={cn(
                                "flex gap-3 max-w-[85%] md:max-w-[75%]",
                                messageIsMe ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <Avatar className="h-8 w-8 mt-1 border bg-background shadow-sm">
                                <AvatarFallback className={cn(messageIsMe ? "text-primary bg-primary/10" : "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400")}>
                                    {messageIsMe ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>

                            <div className={cn("flex flex-col", messageIsMe ? "items-end" : "items-start")}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-xs font-semibold text-foreground">
                                        {messageIsMe ? "Você" : article.from.split('<')[0].trim()}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{article.createdAt}</span>
                                </div>

                                <div className={cn(
                                    "p-4 rounded-2xl text-sm shadow-sm leading-relaxed overflow-hidden break-words relative",
                                    messageIsMe
                                        ? "bg-primary text-primary-foreground rounded-tr-none dark:text-white"
                                        : "bg-card border rounded-tl-none text-foreground dark:bg-zinc-900"
                                )}>
                                    {/* Renderiza HTML seguro do Zammad */}
                                    <div
                                        className={cn(
                                            "prose prose-sm max-w-none break-words",
                                            messageIsMe
                                                ? "prose-p:text-primary-foreground prose-a:text-white prose-a:underline prose-strong:text-white text-white"
                                                : "text-foreground dark:prose-invert"
                                        )}
                                        dangerouslySetInnerHTML={{ __html: article.body }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Área de Input */}
            <div className="p-4 bg-background border-t">
                {isClosed ? (
                    <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg border border-dashed flex flex-col items-center justify-center gap-2">
                        <span className="text-sm font-medium">Este chamado foi encerrado.</span>
                        <p className="text-xs">Crie um novo ticket para tratar de outro assunto.</p>
                    </div>
                ) : (
                    <div className="flex gap-3 items-end">
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escreva uma resposta..."
                            className="min-h-[80px] resize-none bg-muted/30 focus:bg-background transition-all focus:ring-1 focus:ring-primary"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={isPending || !message.trim()}
                            size="icon"
                            className="h-[80px] w-14 shrink-0 shadow-md transition-all hover:scale-105"
                        >
                            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}