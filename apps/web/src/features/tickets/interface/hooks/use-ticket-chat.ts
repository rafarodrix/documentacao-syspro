"use client";

import { useState, useRef, useEffect, useTransition, type ClipboardEvent as ReactClipboardEvent } from "react";
import { TICKET_ATTACHMENT_MAX_BYTES, TICKET_REPLY_MAX_ATTACHMENTS, isAllowedTicketAttachmentMimeType } from "@dosc-syspro/contracts/ticket";
import { toast } from "sonner";
import { replyTicketAction } from "@/features/tickets/application/ticket-actions";
import type { TicketArticleItem } from "@/features/tickets/domain/ticket-model";
import { useSession } from "@/lib/auth-client";

export function useTicketChat(ticketId: string, articles: TicketArticleItem[], autoScrollEnabled = true) {
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: session } = useSession();
    const currentUserEmail = session?.user?.email;

    useEffect(() => {
        if (!autoScrollEnabled) {
            return;
        }

        const marker = scrollRef.current;
        if (!marker) return;

        const viewport = marker.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (!viewport) {
            marker.scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
            return;
        }

        requestAnimationFrame(() => {
            viewport.scrollLeft = 0;
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
        });
    }, [articles, autoScrollEnabled]);

    const handleSend = (visibility: "PUBLIC" | "INTERNAL" = "PUBLIC") => {
        const trimmed = message.trim();
        if (!trimmed && files.length === 0) return;

        startTransition(async () => {
            try {
                const result = await replyTicketAction(ticketId, trimmed, files, visibility);

                if (result.success) {
                    setMessage("");
                    setFiles([]);
                    toast.success(visibility === "INTERNAL" ? "Nota interna registrada!" : "Resposta enviada!");
                } else {
                    toast.error(result.error);
                }
            } catch (error) {
                console.error("Erro ao enviar anexos:", error);
                toast.error("Falha ao enviar arquivos.");
            }
        });
    };

    const appendFiles = (incomingFiles: File[]) => {
        if (!incomingFiles.length) return;

        const valid = incomingFiles.filter((file) => {
            if (file.size > TICKET_ATTACHMENT_MAX_BYTES) {
                return false;
            }

            return isAllowedTicketAttachmentMimeType(file.type || "");
        });

        if (valid.length < incomingFiles.length) {
            toast.warning("Alguns arquivos foram ignorados por tipo nao suportado ou por excederem 5MB.");
        }

        setFiles((prev) => {
            const remainingSlots = Math.max(0, TICKET_REPLY_MAX_ATTACHMENTS - prev.length);
            if (remainingSlots === 0) {
                toast.warning(`Limite de ${TICKET_REPLY_MAX_ATTACHMENTS} anexos por mensagem.`);
                return prev;
            }

            const nextFiles = valid.slice(0, remainingSlots);
            if (nextFiles.length < valid.length) {
                toast.warning(`Somente ${TICKET_REPLY_MAX_ATTACHMENTS} anexos podem ser enviados por mensagem.`);
            }

            return [...prev, ...nextFiles];
        });
    };

    const addFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;
        appendFiles(Array.from(newFiles));
    };

    const handlePaste = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        if (!items.length) {
            return;
        }

        const pastedFiles = items
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file));

        if (!pastedFiles.length) {
            return;
        }

        event.preventDefault();
        appendFiles(pastedFiles);
        toast.success(
            pastedFiles.length === 1
                ? "Imagem anexada a partir da area de transferencia."
                : `${pastedFiles.length} arquivos anexados a partir da area de transferencia.`,
        );
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
        handlePaste,
        isPending,
        scrollRef,
        handleSend,
        isMe,
        isSystem
    };
}
