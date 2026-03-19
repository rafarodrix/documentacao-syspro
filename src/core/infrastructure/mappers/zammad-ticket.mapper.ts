import { TicketPriority, TicketStatus } from "@/core/domain/entities/ticket.entity";

const STATE_NAMES = {
    NOVO: "1. Novo",
    EM_ANALISE: "2. Em Analise",
    EM_DESENVOLVIMENTO: "3. Em Desenvolvimento",
    EM_TESTES: "4. Em Testes",
    AGUARDANDO_CLIENTE: "5. Aguardando Validação Cliente",
    FECHADO: "closed",
    MERGED: "merged",
} as const;

const ACTIVE_WORKFLOW_STATE_IDS = new Set([2, 3]);

const ACTIVE_WORKFLOW_STATE_NAMES = new Set([
    STATE_NAMES.EM_ANALISE.toLowerCase(),
    STATE_NAMES.EM_DESENVOLVIMENTO.toLowerCase(),
]);

export function mapTicketStatusFromStateName(stateName: string): TicketStatus {
    switch (stateName?.trim()) {
        case STATE_NAMES.NOVO:
            return "Aberto";
        case STATE_NAMES.EM_ANALISE:
        case STATE_NAMES.EM_DESENVOLVIMENTO:
            return "Em Análise";
        case STATE_NAMES.EM_TESTES:
        case STATE_NAMES.AGUARDANDO_CLIENTE:
            return "Pendente";
        case STATE_NAMES.FECHADO:
        case STATE_NAMES.MERGED:
            return "Resolvido";
        default:
            return "Em Análise";
    }
}

export function mapTicketStatusFromStateId(stateId: number): TicketStatus {
    if (stateId === 1) return "Aberto";
    if (stateId === 2 || stateId === 3) return "Em Análise";
    if (stateId === 4 || stateId === 5) return "Pendente";
    return "Resolvido";
}

export function mapTicketPriority(priorityId: number, name?: string): TicketPriority {
    const lower = name?.toLowerCase() || "";
    if (priorityId === 3) return "Alta";
    if (lower.includes("high") || lower.includes("alta")) return "Alta";
    if (lower.includes("low") || lower.includes("baixa")) return "Baixa";
    if (priorityId === 1) return "Baixa";
    return "Média";
}

export function mapTicketStateLabel(rawState: string): string {
    const map: Record<string, string> = {
        new: "Novo",
        open: "Aberto",
        pending_reminder: "Pendente",
        pending_close: "Pendente",
        closed: "Resolvido",
        merged: "Mesclado",
        removed: "Removido",
    };

    return map[rawState] || rawState;
}

export function isAnalysisOrDevelopmentStateId(stateId?: number | null): boolean {
    return typeof stateId === "number" && ACTIVE_WORKFLOW_STATE_IDS.has(stateId);
}

export function isAnalysisOrDevelopmentStateName(stateName?: string | null): boolean {
    if (!stateName) return false;
    return ACTIVE_WORKFLOW_STATE_NAMES.has(stateName.trim().toLowerCase());
}
