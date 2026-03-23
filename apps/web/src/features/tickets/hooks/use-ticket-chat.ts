"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { replyTicketAction } from "@/features/tickets/application/actions";
import { useSession } from "@/lib/auth-client";

export function useTicketChat(ticketId: string, articles: any[]) {
    const [message, setMessage] = useState("");
    const [isPending, startTransition] = useTransition();
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: session } = useSession();
    const currentUserEmail = session?.user?.email;

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
        isPending,
        scrollRef,
        handleSend,
        isMe,
        isSystem
    };
}