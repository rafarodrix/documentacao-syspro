"use client";

import { useTicketChat } from "@/features/tickets/interface";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, User, Headset, Bot, AlertCircle, MessageSquareText, Paperclip, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useRef } from "react";
import type { TicketArticleItem } from "./types";

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { 
    ssr: false, 
    loading: () => <div className="h-24 w-full bg-muted/20 animate-pulse rounded-xl border border-border/50" />
});
import "react-quill-new/dist/quill.snow.css";

interface TicketChatProps {
    ticketId: string;
    articles: TicketArticleItem[];
    ticketStatus: string;
}

export function TicketChat({ ticketId, articles, ticketStatus }: TicketChatProps) {
    const { 
        message, setMessage, files, addFiles, removeFile, 
        isPending, scrollRef, handleSend, isMe, isSystem 
    } = useTicketChat(ticketId, articles);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isClosed = ["closed", "merged", "fechado", "resolvido", "finalizado", "recusado"].includes(
        (ticketStatus || "").toLowerCase()
    );

    return (
        <Card className="border-border/60 overflow-hidden">
            <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4 text-primary/80" />
                    Conversa do chamado
                </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
                <ScrollArea className="h-130 bg-[hsl(var(--muted))]/20 dark:bg-[hsl(var(--background))]/40">
                    <div className="p-4 space-y-6">
                        {articles.map((article) => {
                            const messageIsMe = isMe(article.from);
                            const messageIsSystem = isSystem(article.from);

                            if (messageIsSystem) {
                                return (
                                    <div key={article.id} className="flex justify-center">
                                        <span className="text-xs px-4 py-1.5 rounded-full bg-muted text-muted-foreground border shadow-sm flex items-center gap-2">
                                            <Bot className="h-3 w-3" />
                                            {article.body.replace(/<[^>]*>?/gm, "")}
                                            <span className="opacity-70">* {article.createdAt}</span>
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={article.id}
                                    className={cn("flex gap-3 max-w-[92%]", messageIsMe ? "ml-auto flex-row-reverse" : "mr-auto")}
                                >
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

                                    <div className={cn("flex flex-col min-w-0", messageIsMe && "items-end")}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-xs font-medium truncate max-w-55">
                                                {messageIsMe ? "VocÃª" : article.from.split("<")[0]}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{article.createdAt}</span>
                                        </div>

                                        <div
                                            className={cn(
                                                "rounded-2xl p-3 text-sm shadow-sm wrap-break-word prose prose-sm max-w-none",
                                                "prose-pre:bg-black prose-pre:text-white prose-pre:p-3 prose-pre:rounded-lg prose-pre:border",
                                                messageIsMe
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm **:text-primary-foreground"
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
                </ScrollArea>

                <div className="p-4 border-t bg-background">
                    {isClosed ? (
                        <div className="py-6 text-center border border-dashed rounded-xl bg-muted/30 flex flex-col items-center">
                            <AlertCircle className="h-5 w-5 text-muted-foreground" />
                            <p className="mt-2 text-sm font-medium">Chamado encerrado</p>
                            <p className="text-xs text-muted-foreground">Nao e possivel enviar mensagens.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {files.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-1">
                                    {files.map((file, idx) => (
                                        <div 
                                            key={`${file.name}-${idx}`}
                                            className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs animate-in fade-in zoom-in duration-200"
                                        >
                                            <FileText className="h-3 w-3 text-primary" />
                                            <span className="max-w-40 truncate font-medium">{file.name}</span>
                                            <button 
                                                onClick={() => removeFile(idx)}
                                                className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 items-end relative group">
                                <div className="flex-1">
                                    <ReactQuill
                                        theme="snow"
                                        value={message}
                                        onChange={setMessage}
                                        placeholder="Digite sua resposta..."
                                        modules={{
                                            toolbar: [
                                                ['bold', 'italic', 'underline'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                ['clean']
                                            ],
                                        }}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <input 
                                        type="file" 
                                        multiple 
                                        hidden 
                                        ref={fileInputRef} 
                                        onChange={(e) => addFiles(e.target.files)} 
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-10 w-10 rounded-lg shrink-0 border-border/60 hover:bg-muted"
                                        title="Anexar arquivos"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        onClick={handleSend}
                                        disabled={isPending || (!message.trim() && files.length === 0)}
                                        size="icon"
                                        className="h-10 w-10 rounded-lg shadow shrink-0"
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


