import { Injectable } from '@nestjs/common';
import type { TicketModuleSettings, TicketModuleTriageRequest } from '@dosc-syspro/contracts/ticket';
import { ConversationPriority as TicketPriority, ConversationStatus as TicketStatus } from '@prisma/client';

@Injectable()
export class TicketHistoryService {
  resolveCategoryLabel(settings: TicketModuleSettings, category?: string | null): string | null {
    const normalizedCategory = category?.trim();
    if (!normalizedCategory) return null;

    return settings.categories.find((item) => item.value === normalizedCategory)?.label || normalizedCategory;
  }

  formatTicketTeamLabel(team?: string | null): string {
    if (team === 'DESENVOLVIMENTO') return 'Desenvolvimento';
    if (team === 'SUPORTE') return 'Suporte';
    return 'Nao definida';
  }

  formatTicketPriorityLabel(settings: TicketModuleSettings, priority?: TicketPriority | null): string {
    if (!priority) return 'Nao definida';

    const configured = settings.priorities.find((item) => {
      const value = `${item.id} ${item.value} ${item.label}`.toLowerCase();
      if (priority === TicketPriority.CRITICAL) {
        return value.includes('critical') || value.includes('urgent') || value.includes('alta') || value.includes('high') || item.id === '3';
      }
      if (priority === TicketPriority.HIGH) return value.includes('high') || value.includes('alta') || item.id === '3';
      if (priority === TicketPriority.LOW) return value.includes('low') || value.includes('baixa') || item.id === '1';
      return value.includes('normal') || item.id === '2';
    });

    return configured?.label || priority;
  }

  readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
    const value = metadata[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  formatTicketStatusLabel(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.NEW:
        return 'Novo';
      case TicketStatus.UNASSIGNED:
        return 'Sem dono';
      case TicketStatus.TRIAGE:
        return 'Triagem';
      case TicketStatus.IN_PROGRESS:
        return 'Em andamento';
      case TicketStatus.WAITING_CUSTOMER:
        return 'Pendente cliente';
      case TicketStatus.WAITING_INTERNAL:
        return 'Aguardando interno';
      case TicketStatus.TESTING:
        return 'Em testes';
      case TicketStatus.RESOLVED:
        return 'Resolvido';
      case TicketStatus.ARCHIVED:
        return 'Arquivado';
      default:
        return status;
    }
  }

  buildAssignmentBody(input: {
    requesterName: string;
    currentTeam: string | null;
  }) {
    return [
      `${input.requesterName} assumiu o ticket.`,
      `Responsavel atual: ${input.requesterName}`,
      `Estagio: ${this.formatTicketStatusLabel(TicketStatus.NEW)} -> ${this.formatTicketStatusLabel(TicketStatus.IN_PROGRESS)}`,
      `Equipe: ${this.formatTicketTeamLabel(input.currentTeam)}`,
    ].join('\n');
  }

  buildTriageBody(input: {
    requesterName: string;
    settings: TicketModuleSettings;
    triage: TicketModuleTriageRequest;
    resolvedTeam?: 'SUPORTE' | 'DESENVOLVIMENTO';
  }) {
    const lines = [`${input.requesterName} realizou a triagem do ticket.`];

    if (input.triage.priority) {
      lines.push(`Prioridade: ${this.formatTicketPriorityLabel(input.settings, input.triage.priority as TicketPriority)}`);
    }
    if (input.triage.category) {
      lines.push(`Categoria: ${this.resolveCategoryLabel(input.settings, input.triage.category) || input.triage.category}`);
    }
    if (input.resolvedTeam) {
      lines.push(`Equipe: ${this.formatTicketTeamLabel(input.resolvedTeam)}`);
    }

    return lines.join('\n');
  }

  buildUpdateBody(input: {
    requesterDisplayName: string;
    settings: TicketModuleSettings;
    previousTeam: string | null;
    nextTeam: string | null;
    previousStatus: TicketStatus;
    nextStatus: TicketStatus;
    previousCategory: string | null;
    nextCategory: string | null;
    previousPriority: TicketPriority;
    nextPriority: TicketPriority;
    previousCurrentOwnerName: string | null;
    nextCurrentOwnerName: string | null;
    previousSupportOwnerName: string | null;
    nextSupportOwnerName: string | null;
    previousDevelopmentOwnerName: string | null;
    nextDevelopmentOwnerName: string | null;
    previousPublishToReleases: boolean;
    nextPublishToReleases: boolean;
    previousReleaseTitle: string | null;
    nextReleaseTitle: string | null;
    previousReleaseModule: string | null;
    nextReleaseModule: string | null;
    previousReleaseType: string | null;
    nextReleaseType: string | null;
    previousResolutionSummary: string | null;
    nextResolutionSummary: string | null;
    handoffNote?: string;
  }) {
    const historyLines: string[] = [];

    if (input.previousTeam !== input.nextTeam) {
      historyLines.push(`Equipe: ${this.formatTicketTeamLabel(input.previousTeam)} -> ${this.formatTicketTeamLabel(input.nextTeam)}`);
    }

    if (input.previousStatus !== input.nextStatus) {
      historyLines.push(`Estagio: ${this.formatTicketStatusLabel(input.previousStatus)} -> ${this.formatTicketStatusLabel(input.nextStatus)}`);
    }

    if (input.previousCategory !== input.nextCategory) {
      historyLines.push(
        `Categoria: ${this.resolveCategoryLabel(input.settings, input.previousCategory) || 'Nao definida'} -> ${this.resolveCategoryLabel(input.settings, input.nextCategory) || 'Nao definida'}`,
      );
    }

    if (input.previousPriority !== input.nextPriority) {
      historyLines.push(
        `Prioridade: ${this.formatTicketPriorityLabel(input.settings, input.previousPriority)} -> ${this.formatTicketPriorityLabel(input.settings, input.nextPriority)}`,
      );
    }

    if (input.previousCurrentOwnerName !== input.nextCurrentOwnerName) {
      historyLines.push(`Responsavel atual: ${input.previousCurrentOwnerName || 'Nao definido'} -> ${input.nextCurrentOwnerName || 'Nao definido'}`);
    }

    if (input.previousSupportOwnerName !== input.nextSupportOwnerName) {
      historyLines.push(`Analista: ${input.previousSupportOwnerName || 'Nao definido'} -> ${input.nextSupportOwnerName || 'Nao definido'}`);
    }

    if (input.previousDevelopmentOwnerName !== input.nextDevelopmentOwnerName) {
      historyLines.push(`Desenvolvedor: ${input.previousDevelopmentOwnerName || 'Nao definido'} -> ${input.nextDevelopmentOwnerName || 'Nao definido'}`);
    }

    if (input.previousStatus !== TicketStatus.RESOLVED && input.nextStatus === TicketStatus.RESOLVED) {
      historyLines.push('Fechamento: Ticket concluido');
    }

    if (input.nextResolutionSummary && input.nextResolutionSummary !== input.previousResolutionSummary) {
      historyLines.push(`Resolucao: ${input.nextResolutionSummary}`);
    }

    if (!input.previousPublishToReleases && input.nextPublishToReleases) {
      historyLines.push('Release: Publicacao habilitada');
    } else if (input.previousPublishToReleases && !input.nextPublishToReleases) {
      historyLines.push('Release: Publicacao desabilitada');
    }

    if (input.previousReleaseTitle !== input.nextReleaseTitle && input.nextReleaseTitle) {
      historyLines.push(`Titulo da release: ${input.nextReleaseTitle}`);
    }

    if (input.nextReleaseModule && input.nextReleaseModule !== input.previousReleaseModule) {
      historyLines.push(`Modulo da release: ${input.nextReleaseModule}`);
    }

    if (input.nextReleaseType && input.nextReleaseType !== input.previousReleaseType) {
      historyLines.push(`Tipo da release: ${input.nextReleaseType}`);
    }

    if (historyLines.length === 0 && !input.handoffNote) {
      return null;
    }

    const bodyLines = [`${input.requesterDisplayName} alterou o ticket.`, ...historyLines];

    if (input.handoffNote) {
      bodyLines.push(
        input.previousStatus === TicketStatus.TESTING && input.nextStatus === TicketStatus.IN_PROGRESS
          ? `Motivo do retorno: ${input.handoffNote}`
          : `Contexto: ${input.handoffNote}`,
      );
    }

    return bodyLines.join('\n');
  }
}
