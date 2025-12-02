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
        <div className="flex flex-col h-[600px] border border-border/40 rounded-xl bg-background overflow-hidden shadow-sm transition-all">
            {/* --- ÁREA DE MENSAGENS (COM SCROLL) --- */}
            <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-muted/20">
                {articles.map((article) => {
                    const messageIsMe = isMe(article.from);
                    const messageIsSystem = isSystem(article.from);

                    // --- TIPO 1: MENSAGEM DE SISTEMA (Centralizada, estilo log) ---
                    if (messageIsSystem) {
                        return (
                            <div key={article.id} className="flex justify-center">
                                <span className="text-xs bg-muted/80 px-4 py-1.5 rounded-full text-muted-foreground flex items-center gap-2 border border-border/50 shadow-sm select-none">
                                    <Bot className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[300px] md:max-w-full">
                                        {/* Remove tags HTML para log limpo */}
                                        {article.body.replace(/<[^>]*>?/gm, "")}
                                    </span>
                                    <span className="opacity-70">• {article.createdAt}</span>
                                </span>
                            </div>
                        );
                    }

                    // --- TIPO 2: MENSAGEM DE CHAT (Balões) ---
                    return (
                        <div
                            key={article.id}
                            className={cn(
                                "flex gap-3 md:gap-4 max-w-[90%] md:max-w-[80%]",
                                messageIsMe ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}
                        >
                            {/* AVATAR */}
                            <Avatar className="h-8 w-8 md:h-10 md:w-10 mt-0.5 border border-border/50 shadow-sm shrink-0">
                                <AvatarFallback
                                    className={cn(
                                        "text-sm font-medium transition-colors",
                                        messageIsMe
                                            ? "bg-primary/10 text-primary" // Cor do usuário
                                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" // Cor do atendente
                                    )}
                                >
                                    {messageIsMe ? (
                                        <User className="h-4 w-4 md:h-5 md:w-5" />
                                    ) : (
                                        <Headset className="h-4 w-4 md:h-5 md:w-5" />
                                    )}
                                </AvatarFallback>
                            </Avatar>

                            {/* CONTEÚDO (Nome + Balão) */}
                            <div
                                className={cn(
                                    "flex flex-col min-w-0",
                                    messageIsMe ? "items-end" : "items-start"
                                )}
                            >
                                {/* Cabeçalho da Mensagem (Nome e Data) */}
                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                    <span className="text-xs md:text-sm font-medium text-foreground truncate max-w-[200px]">
                                        {messageIsMe
                                            ? "Você"
                                            : article.from.split("<")[0].trim()}
                                    </span>
                                    <span className="text-[10px] md:text-xs text-muted-foreground tabular-nums">
                                        {article.createdAt}
                                    </span>
                                </div>

                                {/* --- O BALÃO DE MENSAGEM --- */}
                                <div
                                    className={cn(
                                        // Estilos Base: Padding, Borda arredondada, Sombra, Quebra de palavra
                                        "p-3 md:p-4 rounded-2xl text-sm shadow-sm relative break-words min-w-0 transition-colors",

                                        // Estilos Condicionais (Eu vs Eles)
                                        messageIsMe
                                            ? "bg-primary text-primary-foreground rounded-tr-sm" // Balão do Usuário (Cor de destaque, bico na direita)
                                            : "bg-muted border border-border/50 text-foreground rounded-tl-sm" // Balão do Atendente (Cor neutra, bico na esquerda)
                                    )}
                                >
                                    {/* Renderizador de HTML Rico (Tailwind Typography) */}
                                    <div
                                        className={cn(
                                            // 'prose' aplica estilos padrão a tags HTML (p, a, ul, code, etc.)
                                            "prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0",
                                            // Garante que blocos de código não quebrem o layout
                                            "prose-pre:bg-zinc-950 prose-pre:text-zinc-50 prose-pre:p-2 md:prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:border prose-pre:border-white/10 prose-pre:my-2 prose-pre:text-xs md:prose-pre:text-sm",
                                            "prose-code:bg-black/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs md:prose-code:text-sm before:prose-code:content-none after:prose-code:content-none",

                                            // Ajuste de cores internas do balão para garantir contraste
                                            messageIsMe
                                                // Se o balão é escuro (primary), força o texto interno a ser claro
                                                ? "[&_*]:text-primary-foreground prose-a:underline prose-a:font-medium"
                                                // Se o balão é claro (muted), usa as cores padrão do tema
                                                : "dark:prose-invert prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline"
                                        )}
                                        dangerouslySetInnerHTML={{ __html: article.body }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {/* Elemento invisível para fazer o scroll automático até o final */}
                <div ref={scrollRef} className="h-px w-full" aria-hidden="true" />
            </div>

            {/* --- ÁREA DE INPUT (FIXA NO RODAPÉ) --- */}
            <div className="p-4 bg-background border-t border-border/40 z-10 relative">
                {isClosed ? (
                    // Estado de Ticket Fechado
                    <div className="py-6 text-center rounded-xl border border-dashed bg-muted/30 flex flex-col items-center justify-center gap-2 animate-in fade-in">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            Chamado Encerrado
                        </span>
                        <p className="text-xs text-muted-foreground">
                            Não é possível enviar novas mensagens.
                        </p>
                    </div>
                ) : (
                    // Campo de Texto e Botão de Enviar
                    <div className="flex gap-3 items-end relative">
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua resposta..."
                            className="min-h-[50px] max-h-[150px] resize-none bg-muted/40 hover:bg-muted/60 focus:bg-background pr-14 py-3 transition-all scrollbar-hide rounded-xl resize-y"
                            onKeyDown={(e) => {
                                // Envia com Enter (sem Shift)
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        {/* Botão de Enviar (Posicionado absolutamente dentro do textarea para visual moderno) */}
                        <Button
                            onClick={handleSend}
                            disabled={isPending || !message.trim()}
                            size="icon"
                            className={cn(
                                "absolute right-2 bottom-2 h-9 w-9 rounded-lg shadow-sm transition-all",
                                message.trim()
                                    ? "hover:scale-105 active:scale-95"
                                    : "opacity-50"
                            )}
                        >
                            {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            <span className="sr-only">Enviar mensagem</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}