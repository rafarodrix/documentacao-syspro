import { Injectable } from '@nestjs/common';
import { IntegrationConnectionsRepository } from './integration-connections.repository';
import type { IntegrationConnectionUpsertInput } from './integration-connections.types';

@Injectable()
export class IntegrationConnectionsValidatorService {
  constructor(
    private readonly integrationConnectionsRepository: IntegrationConnectionsRepository,
  ) {}

  async validateInput(input: IntegrationConnectionUpsertInput, excludeId?: string) {
    if (!input.name?.trim()) throw new Error('name obrigatorio');
    if (!input.companyId?.trim()) throw new Error('companyId obrigatorio');
    if (!input.evolutionApiUrl?.trim()) throw new Error('evolutionApiUrl obrigatorio');
    if (!input.evolutionApiKey?.trim()) throw new Error('evolutionApiKey obrigatorio');
    if (!input.evolutionInstance?.trim()) throw new Error('evolutionInstance obrigatorio');
    if (!input.chatwootUrl?.trim()) throw new Error('chatwootUrl obrigatorio');
    if (!input.chatwootApiToken?.trim()) throw new Error('chatwootApiToken obrigatorio');
    if (!input.chatwootAccountId?.toString().trim()) throw new Error('chatwootAccountId obrigatorio');
    if (!input.chatwootInboxId && !input.chatwootInboxIdentifier) {
      throw new Error('Defina chatwootInboxId ou chatwootInboxIdentifier');
    }
    if (input.chatwootInboxIdentifier && /^\d+$/.test(input.chatwootInboxIdentifier)) {
      throw new Error('chatwootInboxIdentifier nao deve ser numerico');
    }

    const normalizedCompanyId = input.companyId.trim();
    const company = await this.integrationConnectionsRepository.findCompanyById(normalizedCompanyId);

    if (!company || company.deletedAt) {
      throw new Error('companyId invalido');
    }

    const inputGroupJids = this.readConnectionGroupJids(input.metadata);
    const normalizedEvolutionApiUrl = input.evolutionApiUrl.trim();
    const normalizedEvolutionInstance = input.evolutionInstance.trim();
    const normalizedEvolutionInstanceId = input.evolutionInstanceId?.trim() || null;
    const normalizedChatwootUrl = input.chatwootUrl.trim();
    const normalizedChatwootAccountId = input.chatwootAccountId.toString().trim();
    const normalizedChatwootInboxId = input.chatwootInboxId?.toString().trim() || null;
    const normalizedChatwootInboxIdentifier = input.chatwootInboxIdentifier?.trim() || null;

    const evolutionConflict = await this.integrationConnectionsRepository.findFirstActiveEvolutionConflict({
      evolutionApiUrl: normalizedEvolutionApiUrl,
      evolutionInstance: normalizedEvolutionInstance,
      evolutionInstanceId: normalizedEvolutionInstanceId,
      excludeId,
    });

    if ((input.status ?? 'ACTIVE') === 'ACTIVE' && evolutionConflict) {
      if (inputGroupJids.length === 0) {
        throw new Error(`Instancia Evolution ja vinculada pela conexao ${evolutionConflict.name}.`);
      }

      const sameInstanceConnections = await this.integrationConnectionsRepository.findActiveEvolutionConnections({
        evolutionApiUrl: normalizedEvolutionApiUrl,
        evolutionInstance: normalizedEvolutionInstance,
        evolutionInstanceId: normalizedEvolutionInstanceId,
        excludeId,
      });
      const groupConflict = sameInstanceConnections.find((row) => {
        const existingGroupJids = this.readConnectionGroupJids(row.metadata);
        return existingGroupJids.some((jid) => inputGroupJids.includes(jid));
      });

      if (groupConflict) {
        throw new Error(`Grupo Evolution ja vinculado pela conexao ${groupConflict.name}.`);
      }
    }

    const inboxConflict = await this.integrationConnectionsRepository.findFirstActiveInboxConflict({
      chatwootUrl: normalizedChatwootUrl,
      chatwootAccountId: normalizedChatwootAccountId,
      chatwootInboxId: normalizedChatwootInboxId,
      chatwootInboxIdentifier: normalizedChatwootInboxIdentifier,
      excludeId,
    });

    if ((input.status ?? 'ACTIVE') === 'ACTIVE' && inboxConflict) {
      throw new Error(`Inbox do Chatwoot ja vinculada pela conexao ${inboxConflict.name}.`);
    }
  }

  private readConnectionGroupJids(metadata?: Record<string, unknown> | null): string[] {
    const source = metadata && typeof metadata === 'object' ? metadata : {};
    const evolution =
      source && typeof source.evolution === 'object' && source.evolution
        ? (source.evolution as Record<string, unknown>)
        : source;
    const raw =
      Array.isArray(evolution.allowedGroups) ? evolution.allowedGroups :
      Array.isArray(evolution.groups) ? evolution.groups :
      Array.isArray(evolution.allowedGroupJids) ? evolution.allowedGroupJids :
      Array.isArray(evolution.groupJids) ? evolution.groupJids :
      typeof evolution.allowedGroupJids === 'string' ? evolution.allowedGroupJids.split(',') :
      typeof evolution.groupJids === 'string' ? evolution.groupJids.split(',') :
      [];

    return Array.from(new Set(
      raw
        .map((item: unknown) => {
          if (typeof item === 'string') return item.trim().toLowerCase();
          if (item && typeof item === 'object') {
            const sourceItem = item as Record<string, unknown>;
            return String(sourceItem.jid ?? sourceItem.groupJid ?? '').trim().toLowerCase();
          }
          return '';
        })
        .filter((item) => item.endsWith('@g.us')),
    ));
  }
}
