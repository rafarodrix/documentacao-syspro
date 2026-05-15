"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateTicketOwnersAction } from "@/features/tickets/application/ticket-actions";

export function useTicketOwners(ticketId?: string | number) {
    const [isUpdatingOwners, setIsUpdatingOwners] = useState(false);

    const onUpdateOwners = async (payload: { supportOwnerUserId?: string; developmentOwnerUserId?: string }) => {
        if (!ticketId) return;

        setIsUpdatingOwners(true);
        try {
            const res = await updateTicketOwnersAction(String(ticketId), {
                ...(payload.supportOwnerUserId !== undefined ? { supportOwnerUserId: payload.supportOwnerUserId.trim() } : {}),
                ...(payload.developmentOwnerUserId !== undefined ? { developmentOwnerUserId: payload.developmentOwnerUserId.trim() } : {}),
            });
            if (res.success) {
                toast.success("Responsaveis atualizados.");
            } else {
                toast.error(res.error || "Erro ao atualizar responsaveis");
            }
        } finally {
            setIsUpdatingOwners(false);
        }
    };

    return { isUpdatingOwners, onUpdateOwners };
}
