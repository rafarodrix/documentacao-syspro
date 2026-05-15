"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TicketModulePriority, TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import { updateTicketClassificationAction } from "@/features/tickets/application/ticket-actions";
import { useTicketModuleSettings } from "./use-ticket-module-settings";
import type { TicketDetailsItem } from "../components/ticket-view.types";

type TicketModuleSettingsOption = { value: string; label: string; defaultTeam?: string };

function mapPriorityToLevel(priority: TicketModulePriority): number {
    if (priority === "LOW") return 1;
    if (priority === "HIGH" || priority === "CRITICAL") return 3;
    return 2;
}

function mapLevelToPriority(priority: number): TicketModulePriority {
    if (priority === 1) return "LOW";
    if (priority === 3) return "HIGH";
    return "NORMAL";
}

function resolveCategoryForTeam(categories: TicketModuleSettingsOption[], team: string, currentCategory?: string | null) {
    const normalizedTeam = team.trim().toUpperCase();
    const teamOptions = categories.filter((category) => !category.defaultTeam || category.defaultTeam === normalizedTeam);
    const options = teamOptions.length ? teamOptions : categories;
    const current = (currentCategory || "").trim();
    const currentIsValid = Boolean(current) && options.some((category) => category.value.toLowerCase() === current.toLowerCase());

    if (currentIsValid) return current;
    return options[0]?.value || current;
}

function normalizeStatusValue(status?: string | null): TicketModuleStatus | null {
    const normalized = (status || "").trim().toLowerCase();
    if (normalized === "testing" || normalized === "em testes" || normalized === "em teste") return "TESTING";
    return null;
}

export function useTicketClassification(ticket: TicketDetailsItem | undefined, canManageTickets: boolean) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const ticketSettings = useTicketModuleSettings();

    const [localTeam, setLocalTeam] = useState(ticket?.operations?.currentTeam || "");
    const [localModule, setLocalModule] = useState(ticket?.operations?.module || "");
    const [localCategory, setLocalCategory] = useState(ticket?.operations?.category || "");
    const [localPriority, setLocalPriority] = useState(ticket?.priority);
    const [transferNote, setTransferNote] = useState("");

    useEffect(() => {
        setLocalTeam(ticket?.operations?.currentTeam || "");
        setLocalModule(ticket?.operations?.module || "");
        setLocalCategory(ticket?.operations?.category || "");
        setLocalPriority(ticket?.priority);
        setTransferNote("");
    }, [ticket?.id, ticket?.operations?.category, ticket?.operations?.currentTeam, ticket?.operations?.module, ticket?.priority]);

    const initialTeam = ticket?.operations?.currentTeam || ticketSettings.defaultTeam || "SUPORTE";
    const initialModule = ticket?.operations?.module || "";
    const initialCategory = ticket?.operations?.category || "";
    const initialPriority = ticket?.priority ?? 2;

    const currentTeam = localTeam || ticket?.operations?.currentTeam || ticketSettings.defaultTeam || "SUPORTE";
    const currentModule = localModule || ticket?.operations?.module || "";
    const currentCategory = localCategory || ticket?.operations?.category || "";
    const currentPriority = localPriority ?? ticket?.priority ?? 2;

    const classificationDirty =
        currentTeam !== initialTeam ||
        currentModule !== initialModule ||
        currentCategory !== initialCategory ||
        currentPriority !== initialPriority;

    const movingToDevelopment = currentTeam === "DESENVOLVIMENTO" && initialTeam !== "DESENVOLVIMENTO";
    const returningFromTesting = normalizeStatusValue(ticket?.status) === "TESTING";
    const requiresTransferNote = movingToDevelopment && canManageTickets;
    const requiresTestingReturnNote = returningFromTesting && canManageTickets && ticketSettings.requireTestingReturnReason;

    const changeTeam = (team: string) => {
        if (!ticket || team === currentTeam) return;
        const nextCategory = resolveCategoryForTeam(ticketSettings.categories, team, currentCategory);
        setLocalTeam(team);
        if (nextCategory !== currentCategory) setLocalCategory(nextCategory);
        if (team !== "DESENVOLVIMENTO") setTransferNote("");
    };

    const changeClassification = (payload: { module?: string; category?: string; priority?: TicketModulePriority }) => {
        if (payload.module !== undefined) setLocalModule(payload.module);
        if (payload.category !== undefined) setLocalCategory(payload.category);
        if (payload.priority !== undefined) setLocalPriority(mapPriorityToLevel(payload.priority));
    };

    const resetClassificationDraft = () => {
        setLocalTeam(ticket?.operations?.currentTeam || "");
        setLocalModule(ticket?.operations?.module || "");
        setLocalCategory(ticket?.operations?.category || "");
        setLocalPriority(ticket?.priority);
        setTransferNote("");
    };

    const persistWorkflowChange = (status?: TicketModuleStatus, successMessage = "Alteracoes salvas.") => {
        if (!ticket) return;

        const payload: { team?: string; module?: string; category?: string; priority?: TicketModulePriority; status?: TicketModuleStatus; note?: string } = {};
        if (currentTeam !== initialTeam) payload.team = currentTeam;
        if (currentModule !== initialModule) payload.module = currentModule;
        if (currentCategory !== initialCategory) payload.category = currentCategory;
        if (currentPriority !== initialPriority) payload.priority = mapLevelToPriority(currentPriority);
        if (status) payload.status = status;
        if (movingToDevelopment) {
            const normalizedNote = transferNote.trim();
            if (normalizedNote.length < 20) {
                toast.error("Informe o contexto para o desenvolvimento com no minimo 20 caracteres.");
                return;
            }
            payload.note = normalizedNote;
        }

        if (!Object.keys(payload).length) return;

        startTransition(async () => {
            const res = await updateTicketClassificationAction(String(ticket.id), payload);
            if (res.success) {
                toast.success(successMessage);
                setTransferNote("");
                router.refresh();
            } else {
                toast.error(res.error || "Erro ao atualizar ticket");
            }
        });
    };

    const saveClassification = () => {
        if (!ticket || !classificationDirty) return;
        persistWorkflowChange(undefined, "Alteracoes salvas.");
    };

    return {
        isPending,
        localTeam,
        localModule,
        localCategory,
        localPriority,
        transferNote,
        setTransferNote,
        currentTeam,
        currentModule,
        currentCategory,
        currentPriority,
        initialTeam,
        initialModule,
        initialCategory,
        initialPriority,
        classificationDirty,
        movingToDevelopment,
        requiresTransferNote,
        requiresTestingReturnNote,
        changeTeam,
        changeClassification,
        resetClassificationDraft,
        persistWorkflowChange,
        saveClassification,
        mapLevelToPriority,
    };
}
