"use client";

import { useState, useRef, useEffect } from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, User, Headset, Bot } from "lucide-react";
import { replyTicketAction } from "@/app/(platform)/client/_actions/ticket-actions"; // Ajuste o caminho conforme necessário
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

    const isClosed = ['closed', 'merged', 'fechado', 'resolvido'].includes(ticketStatus.toLowerCase());

    return (
        <div className="flex flex-col h-[600px] border rounded-xl bg-muted/10 overflow-hidden">

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {articles.map((article) => {
                    const isMe = article.sender === 'Customer';
                    const isSystem = article.sender === 'System';

                    if (isSystem) {
                        return (
                            <div key={article.id} className="flex justify-center my-4">
                                <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground flex items-center gap-2">
                                    <Bot className="h-3 w-3" /> {article.body.replace(/<[^>]*>?/gm, '')} • {article.createdAt}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={article.id}
                            className={cn(
                                "flex gap-3 max-w-[80%]",
                                isMe ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <Avatar className="h-8 w-8 mt-1 border bg-background">
                                <AvatarFallback className={cn(isMe ? "text-primary" : "text-orange-500")}>
                                    {isMe ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>

                            <div className={cn(
                                "flex flex-col",
                                isMe ? "items-end" : "items-start"
                            )}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-xs font-medium text-foreground/80">{article.from}</span>
                                    <span className="text-[10px] text-muted-foreground">{article.createdAt}</span>
                                </div>

                                <div className={cn(
                                    "p-3.5 rounded-2xl text-sm shadow-sm leading-relaxed",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-card border rounded-tl-none"
                                )}>
                                    {/* Renderização HTML segura simplificada ou texto puro */}
                                    <div dangerouslySetInnerHTML={{ __html: article.body }} className="prose prose-sm dark:prose-invert max-w-none" />
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
                    <div className="text-center py-4 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        Este chamado foi encerrado. Para reabrir, crie um novo ticket.
                    </div>
                ) : (
                    <div className="flex gap-3 items-end">
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escreva uma resposta..."
                            className="min-h-[80px] resize-none bg-muted/30 focus:bg-background transition-colors"
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
                            className="h-[80px] w-14 shrink-0 shadow-md"
                        >
                            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}