"use client";

import { useState, useRef, useEffect } from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, User, Headset, Bot } from "lucide-react";
import { replyTicketAction } from "@/actions/app/ticket-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Article {
    id: number;
    body: string;
    from: string;
    createdAt: string;
    sender: string; // 'Customer', 'Agent', 'System'
}

interface TicketChatProps {
    ticketId: string;
    articles: Article[];
    ticketStatus: string;
}

export function TicketChat({ ticketId, articles, ticketStatus }: TicketChatProps) {
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll para o final
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [articles]);

    const handleSend = () => {
        if (!message.trim()) return;

        startTransition(async () => {
            const result = await replyTicketAction(ticketId, message);
            if (result.success) {
                setMessage("");
                toast.success("Resposta enviada!");
            } else {
                toast.error(result.error || "Erro ao enviar.");
            }
        });
    };

    const isClosed = ['closed', 'merged', 'fechado', 'resolvido'].includes((ticketStatus || '').toLowerCase());

    return (
        <div className="flex flex-col h-[600px] border rounded-xl bg-muted/10 overflow-hidden shadow-sm">

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-background/50">
                {articles.map((article) => {
                    const isMe = article.sender === 'Customer';
                    const isSystem = article.sender === 'System';

                    if (isSystem) {
                        return (
                            <div key={article.id} className="flex justify-center my-4">
                                <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground flex items-center gap-2 border border-border/50">
                                    <Bot className="h-3 w-3" />
                                    {/* Remove tags HTML simples para log do sistema */}
                                    {article.body.replace(/<[^>]*>?/gm, '')} • {article.createdAt}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={article.id}
                            className={cn(
                                "flex gap-3 max-w-[85%] md:max-w-[75%]",
                                isMe ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <Avatar className="h-8 w-8 mt-1 border bg-background shadow-sm">
                                <AvatarFallback className={cn(isMe ? "text-primary bg-primary/10" : "text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400")}>
                                    {isMe ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>

                            <div className={cn(
                                "flex flex-col",
                                isMe ? "items-end" : "items-start"
                            )}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-xs font-semibold text-foreground">{article.from}</span>
                                    <span className="text-[10px] text-muted-foreground">{article.createdAt}</span>
                                </div>

                                {/* BALÃO DE MENSAGEM */}
                                <div className={cn(
                                    "p-4 rounded-2xl text-sm shadow-sm leading-relaxed overflow-hidden break-words relative",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-tr-none dark:text-white"
                                        : "bg-card border rounded-tl-none text-foreground dark:bg-zinc-900"
                                )}>
                                    {/* CORREÇÃO DE ESTILO:
                     1. 'prose': Aplica estilos base para HTML.
                     2. 'prose-sm': Tamanho de fonte adequado.
                     3. 'dark:prose-invert': Inverte cores no modo escuro (texto claro).
                     4. Estilos inline específicos para garantir contraste no balão do cliente (que tem fundo azul).
                  */}
                                    <div
                                        className={cn(
                                            "prose prose-sm max-w-none break-words",
                                            // Se for eu (fundo azul/primary), forçamos texto branco/claro para contraste
                                            isMe ? "prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-a:text-primary-foreground/90 prose-strong:text-primary-foreground prose-li:text-primary-foreground text-white dark:text-white"
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
                        <p className="text-xs">Para reabrir ou tratar de outro assunto, crie um novo ticket.</p>
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