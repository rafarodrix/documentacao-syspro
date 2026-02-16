"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { replyTicketAction } from "@/actions/tickets/ticket-actions";
import { useSession } from "@/lib/auth-client"; // Para identificar "Eu" vs "Eles"

export function useTicketChat(ticketId: string, articles: any[]) {
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Identifica o usuário logado para saber de que lado colocar o balão
    const { data: session } = useSession();
    const currentUserEmail = session?.user?.email;

    // Auto-scroll para o final sempre que chegar mensagem nova
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [articles]);

    // Enviar mensagem
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

    // Helpers de Identificação (Lógica de Negócio)

    // Verifica se a mensagem foi enviada por MIM (usuário logado)
    const isMe = (from: string) => {
        if (!currentUserEmail) return false;
        return from.includes(currentUserEmail);
    };

    // Verifica se é mensagem automática do sistema
    const isSystem = (from: string) => {
        return !from.includes('@'); // Mensagens de sistema geralmente não têm email no remetente
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