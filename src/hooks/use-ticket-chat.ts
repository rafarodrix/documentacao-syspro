"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { replyTicketAction } from "@/actions/tickets/ticket-actions";
import { useSession } from "@/lib/auth-client"; // Para saber quem sou eu

export function useTicketChat(ticketId: string, articles: any[]) {
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Identificação do usuário atual para o chat (Lado Direito)
    const { data: session } = useSession();
    const currentUserEmail = session?.user?.email;

    // Auto-scroll para a última mensagem
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
                toast.error(result.error || "Erro ao enviar mensagem.");
            }
        });
    };

    // Helper para identificar quem enviou a mensagem
    const isMe = (from: string) => {
        return currentUserEmail && from.includes(currentUserEmail);
    };

    // Helper para saber se é mensagem de sistema (sem email)
    const isSystem = (from: string) => {
        return !from.includes('@');
    };

    return {
        message,
        setMessage,
        isPending,
        scrollRef,
        handleSend,
        isMe,
        isSystem
    };
}