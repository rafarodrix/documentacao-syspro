"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { replyTicketAction } from "@/features/tickets/application/ticket-actions";
import type { TicketArticleItem } from "@/features/tickets/domain/ticket-model";
import { useSession } from "@/lib/auth-client";
import { fileToBase64 } from "@/features/tickets/application/utils";

export function useTicketChat(ticketId: string, articles: TicketArticleItem[]) {
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: session } = useSession();
    const currentUserEmail = session?.user?.email;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [articles]);

    const handleSend = (visibility: "PUBLIC" | "INTERNAL" = "PUBLIC") => {
        const trimmed = message.trim();
        if (!trimmed && files.length === 0) return;

        startTransition(async () => {
            try {
                const attachments = await Promise.all(
                    files.map(async (file) => ({
                        filename: file.name,
                        data: await fileToBase64(file),
                        "mime-type": file.type || "application/octet-stream",
                    }))
                );

                const result = await replyTicketAction(ticketId, trimmed, attachments, visibility);

                if (result.success) {
                    setMessage("");
                    setFiles([]);
                    toast.success(visibility === "INTERNAL" ? "Nota interna registrada!" : "Resposta enviada!");
                } else {
                    toast.error(result.error);
                }
            } catch (error) {
                console.error("Erro ao preparar anexos:", error);
                toast.error("Falha ao processar arquivos.");
            }
        });
    };

    const addFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;
        const list = Array.from(newFiles);
        // Limit to 5MB per file for safety
        const valid = list.filter(f => f.size <= 5 * 1024 * 1024);
        if (valid.length < list.length) {
            toast.warning("Alguns arquivos foram ignorados por excederem 5MB.");
        }
        setFiles(prev => [...prev, ...valid]);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const isMe = (from: string) => {
        if (!currentUserEmail) return false;
        return from.includes(currentUserEmail);
    };

    const isSystem = (from: string) => {
        return !from.includes('@');
    };

    return {
        message,
        setMessage,
        files,
        addFiles,
        removeFile,
        isPending,
        scrollRef,
        handleSend,
        isMe,
        isSystem
    };
}

