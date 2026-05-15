"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveTicketAction } from "@/features/tickets/application/ticket-actions";

export function useTicketArchive(ticketId?: string | number) {
    const router = useRouter();
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const handleArchiveTicket = async () => {
        if (!ticketId) return;

        try {
            setIsArchiving(true);
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 20_000),
            );
            const res = await Promise.race([archiveTicketAction(String(ticketId)), timeout]);

            if (res.success) {
                setArchiveDialogOpen(false);
                toast.success(res.message || "Ticket arquivado com sucesso.");
                router.back();
                return;
            }

            toast.error(res.error || "Erro ao arquivar ticket.");
        } catch (err) {
            if (err instanceof Error && err.message === "timeout") {
                toast.error("O servidor nao respondeu. Verifique sua conexao e tente novamente.");
            } else {
                toast.error("Erro ao arquivar ticket.");
            }
        } finally {
            setIsArchiving(false);
        }
    };

    return { archiveDialogOpen, setArchiveDialogOpen, isArchiving, handleArchiveTicket };
}
