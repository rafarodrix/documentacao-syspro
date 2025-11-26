"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, User, Headset, Bot, CheckCheck, Lock, MessageSquareDashed } from "lucide-react";
import { replyTicketAction } from "@/app/(platform)/client/_actions/ticket-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Article {
    id: number;
    body: string;
    from: string;
    createdAt: string;
    sender: string;
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

    // Auto-scroll ao carregar ou receber mensagens
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
        <div className="flex flex-col h-[650px] border border-border/60 rounded-xl bg-background shadow-sm overflow-hidden">

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/5 scroll-smooth">
                {articles.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2">
                        <div className="p-4 rounded-full bg-muted/30">
                            <MessageSquareDashed className="h-8 w-8" />
                        </div>
                        <p>Nenhuma mensagem encontrada.</p>
                    </div>
                )}

                {articles.map((article) => {
                    const isMe = article.sender === 'Customer';
                    const isSystem = article.sender === 'System';

                    // Mensagens do Sistema (Centralizadas)
                    if (isSystem) {
                        return (
                            <div key={article.id} className="flex justify-center my-6 animate-in fade-in zoom-in duration-500">
                                <span className="text-[10px] bg-muted/40 border border-border/40 px-3 py-1 rounded-full text-muted-foreground flex items-center gap-2 uppercase tracking-wide font-medium">
                                    <Bot className="h-3 w-3" />
                                    {article.body.replace(/<[^>]*>?/gm, '')}
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                    {article.createdAt}
                                </span>
                            </div>
                        );
                    }

                    // Mensagens de Usuário/Agente
                    return (
                        <div
                            key={article.id}
                            className={cn(
                                "flex gap-4 max-w-[90%] md:max-w-[80%] animate-in slide-in-from-bottom-2 duration-500",
                                isMe ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            {/* Avatar */}
                            <Avatar className={cn("h-8 w-8 mt-1 border shadow-sm", isMe ? "bg-primary/10" : "bg-background")}>
                                <AvatarFallback className={cn(
                                    "text-xs font-bold",
                                    isMe ? "text-primary" : "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30"
                                )}>
                                    {isMe ? <User className="h-4 w-4" /> : <Headset className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>

                            <div className={cn(
                                "flex flex-col gap-1 min-w-0", // min-w-0 evita overflow flex
                                isMe ? "items-end" : "items-start"
                            )}>
                                {/* Cabeçalho da Mensagem */}
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-xs font-medium text-foreground/80">{article.from}</span>
                                    <span className="text-[10px] text-muted-foreground opacity-70">{article.createdAt}</span>
                                </div>

                                {/* Balão de Mensagem */}
                                <div className={cn(
                                    "px-5 py-3.5 rounded-2xl text-sm shadow-sm relative group transition-all",
                                    isMe
                                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                                        : "bg-white dark:bg-zinc-900 border border-border/60 text-foreground rounded-tl-sm"
                                )}>
                                    {/* CORREÇÃO CRÍTICA: 
                      [&_*] força todos os elementos filhos a herdarem a cor definida no pai.
                      Isso sobrescreve estilos inline que possam vir do Zammad ou conflitos do 'prose'.
                  */}
                                    <div
                                        className={cn(
                                            "prose prose-sm max-w-none break-words leading-relaxed",
                                            isMe
                                                ? "[&_*]:text-primary-foreground [&_a]:underline [&_a]:decoration-white/50" // Força texto branco no balão do cliente
                                                : "dark:prose-invert [&_*]:text-foreground" // Texto padrão no balão do agente
                                        )}
                                        dangerouslySetInnerHTML={{ __html: article.body }}
                                    />

                                    {/* Status de Leitura (Visual) */}
                                    {isMe && (
                                        <div className="absolute bottom-1 right-1.5 opacity-0 group-hover:opacity-80 transition-opacity">
                                            <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} className="h-1" />
            </div>

            {/* Área de Input (Rodapé) */}
            <div className="p-4 bg-background border-t border-border/40">
                {isClosed ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/60 mx-2 animate-in fade-in">
                        <div className="p-2.5 rounded-full bg-muted/50 text-muted-foreground">
                            <Lock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">Este chamado foi encerrado.</p>
                            <p className="text-xs text-muted-foreground">Para novas dúvidas, abra uma nova solicitação.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3 items-end max-w-5xl mx-auto">
                        <div className="relative flex-1 group">
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escreva uma resposta para o suporte..."
                                className="min-h-[60px] max-h-[200px] py-3 pr-12 resize-none bg-muted/20 focus:bg-background transition-all border-border/60 focus:ring-2 focus:ring-primary/10 rounded-xl shadow-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <div className="absolute bottom-2 right-3 hidden sm:flex items-center gap-1 pointer-events-none transition-opacity opacity-40 group-focus-within:opacity-100">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Enter envia</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleSend}
                            disabled={isPending || !message.trim()}
                            size="icon"
                            className="h-[60px] w-[60px] shrink-0 rounded-xl shadow-md bg-gradient-to-b from-primary to-primary/90 hover:to-primary transition-all hover:scale-105 active:scale-95"
                        >
                            {isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6 ml-0.5" />}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}