import type { TicketModuleSettings, TicketModuleTriageRequest } from '@dosc-syspro/contracts/ticket';
import { mapStatusLabel, formatTeamLabel } from './ticket-status.js';
import { resolveCategoryLabel, formatPriorityLabel } from './ticket-settings.js';

export function buildAssignmentBody(input: {
  requesterName: string;
  currentTeam: string | null;
}): string {
  return [
    `${input.requesterName} assumiu o ticket.`,
    `Responsavel atual: ${input.requesterName}`,
    `Estagio: ${mapStatusLabel('NEW')} -> ${mapStatusLabel('IN_PROGRESS')}`,
    `Equipe: ${formatTeamLabel(input.currentTeam)}`,
  ].join('\n');
}

export function buildTriageBody(input: {
  requesterName: string;
  settings: TicketModuleSettings;
  triage: TicketModuleTriageRequest;
  resolvedTeam?: 'SUPORTE' | 'DESENVOLVIMENTO';
}): string {
  const lines = [`${input.requesterName} realizou a triagem do ticket.`];

  if (input.triage.priority) {
    lines.push(`Prioridade: ${formatPriorityLabel(input.settings, input.triage.priority)}`);
  }
  if (input.triage.category) {
    lines.push(`Categoria: ${resolveCategoryLabel(input.settings, input.triage.category) ?? input.triage.category}`);
  }
  if (input.resolvedTeam) {
    lines.push(`Equipe: ${formatTeamLabel(input.resolvedTeam)}`);
  }

  return lines.join('\n');
}

export function buildUpdateBody(input: {
  requesterDisplayName: string;
  settings: TicketModuleSettings;
  previousTeam: string | null;
  nextTeam: string | null;
  previousStatus: string;
  nextStatus: string;
  previousCategory: string | null;
  nextCategory: string | null;
  previousPriority: string;
  nextPriority: string;
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
}): string | null {
  const historyLines: string[] = [];

  if (input.previousTeam !== input.nextTeam) {
    historyLines.push(`Equipe: ${formatTeamLabel(input.previousTeam)} -> ${formatTeamLabel(input.nextTeam)}`);
  }

  if (input.previousStatus !== input.nextStatus) {
    historyLines.push(`Estagio: ${mapStatusLabel(input.previousStatus)} -> ${mapStatusLabel(input.nextStatus)}`);
  }

  if (input.previousCategory !== input.nextCategory) {
    historyLines.push(
      `Categoria: ${resolveCategoryLabel(input.settings, input.previousCategory) ?? 'Nao definida'} -> ${resolveCategoryLabel(input.settings, input.nextCategory) ?? 'Nao definida'}`,
    );
  }

  if (input.previousPriority !== input.nextPriority) {
    historyLines.push(
      `Prioridade: ${formatPriorityLabel(input.settings, input.previousPriority)} -> ${formatPriorityLabel(input.settings, input.nextPriority)}`,
    );
  }

  if (input.previousCurrentOwnerName !== input.nextCurrentOwnerName) {
    historyLines.push(`Responsavel atual: ${input.previousCurrentOwnerName ?? 'Nao definido'} -> ${input.nextCurrentOwnerName ?? 'Nao definido'}`);
  }

  if (input.previousSupportOwnerName !== input.nextSupportOwnerName) {
    historyLines.push(`Analista: ${input.previousSupportOwnerName ?? 'Nao definido'} -> ${input.nextSupportOwnerName ?? 'Nao definido'}`);
  }

  if (input.previousDevelopmentOwnerName !== input.nextDevelopmentOwnerName) {
    historyLines.push(`Desenvolvedor: ${input.previousDevelopmentOwnerName ?? 'Nao definido'} -> ${input.nextDevelopmentOwnerName ?? 'Nao definido'}`);
  }

  if (input.previousStatus !== 'RESOLVED' && input.nextStatus === 'RESOLVED') {
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

  if (historyLines.length === 0 && !input.handoffNote) return null;

  const bodyLines = [`${input.requesterDisplayName} alterou o ticket.`, ...historyLines];

  if (input.handoffNote) {
    bodyLines.push(
      input.previousStatus === 'TESTING' && input.nextStatus === 'IN_PROGRESS'
        ? `Motivo do retorno: ${input.handoffNote}`
        : `Contexto: ${input.handoffNote}`,
    );
  }

  return bodyLines.join('\n');
}
