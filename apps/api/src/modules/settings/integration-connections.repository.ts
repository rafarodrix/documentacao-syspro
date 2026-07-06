import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IntegrationConnectionDatabaseInput,
  IntegrationConnectionRecord,
} from './integration-connections.types';

@Injectable()
export class IntegrationConnectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId?: string): Promise<IntegrationConnectionRecord[]> {
    const rows = await this.integrationConnectionTable().findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    return rows as IntegrationConnectionRecord[];
  }

  async findById(id: string): Promise<IntegrationConnectionRecord | null> {
    const row = await this.integrationConnectionTable().findUnique({ where: { id } });
    return (row as IntegrationConnectionRecord | null) ?? null;
  }

  async findFirstActive(): Promise<IntegrationConnectionRecord | null> {
    const row = await this.integrationConnectionTable().findFirst({
      where: { status: 'ACTIVE' },
      orderBy: [{ companyId: 'asc' }, { createdAt: 'asc' }],
    });

    return (row as IntegrationConnectionRecord | null) ?? null;
  }

  async listActive(filters?: {
    companyIds?: string[];
    accountId?: string;
    orFilters?: Array<Record<string, string>>;
    orderBy?: 'companyThenCreatedAtAsc' | 'createdAtAsc';
  }): Promise<IntegrationConnectionRecord[]> {
    const rows = await this.integrationConnectionTable().findMany({
      where: {
        status: 'ACTIVE',
        ...(filters?.companyIds?.length ? { companyId: { in: filters.companyIds } } : {}),
        ...(filters?.accountId ? { chatwootAccountId: filters.accountId } : {}),
        ...(filters?.orFilters?.length ? { OR: filters.orFilters } : {}),
      },
      orderBy: filters?.orderBy === 'createdAtAsc'
        ? [{ createdAt: 'asc' }]
        : [{ companyId: 'asc' }, { createdAt: 'asc' }],
    });

    return rows as IntegrationConnectionRecord[];
  }

  async create(data: IntegrationConnectionDatabaseInput): Promise<IntegrationConnectionRecord> {
    const row = await this.integrationConnectionTable().create({ data });
    return row as IntegrationConnectionRecord;
  }

  async update(id: string, data: IntegrationConnectionDatabaseInput): Promise<IntegrationConnectionRecord> {
    const row = await this.integrationConnectionTable().update({
      where: { id },
      data,
    });
    return row as IntegrationConnectionRecord;
  }

  async remove(id: string) {
    await this.integrationConnectionTable().delete({ where: { id } });
  }

  async findCompanyById(companyId: string) {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, deletedAt: true },
    });
  }

  async findFirstActiveEvolutionConflict(input: {
    evolutionApiUrl: string;
    evolutionInstance: string;
    evolutionInstanceId?: string | null;
    excludeId?: string;
  }): Promise<Pick<IntegrationConnectionRecord, 'id' | 'name' | 'companyId'> | null> {
    const row = await this.integrationConnectionTable().findFirst({
      where: {
        status: 'ACTIVE',
        evolutionApiUrl: input.evolutionApiUrl,
        ...(input.evolutionInstanceId
          ? { evolutionInstanceId: input.evolutionInstanceId }
          : { evolutionInstance: input.evolutionInstance }),
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: { id: true, name: true, companyId: true },
    });

    return (row as Pick<IntegrationConnectionRecord, 'id' | 'name' | 'companyId'> | null) ?? null;
  }

  async findActiveEvolutionConnections(input: {
    evolutionApiUrl: string;
    evolutionInstance: string;
    evolutionInstanceId?: string | null;
    excludeId?: string;
  }): Promise<Array<Pick<IntegrationConnectionRecord, 'id' | 'name' | 'metadata'>>> {
    const rows = await this.integrationConnectionTable().findMany({
      where: {
        status: 'ACTIVE',
        evolutionApiUrl: input.evolutionApiUrl,
        ...(input.evolutionInstanceId
          ? { evolutionInstanceId: input.evolutionInstanceId }
          : { evolutionInstance: input.evolutionInstance }),
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: { id: true, name: true, metadata: true },
    });

    return rows as Array<Pick<IntegrationConnectionRecord, 'id' | 'name' | 'metadata'>>;
  }

  async findFirstActiveInboxConflict(input: {
    chatwootUrl: string;
    chatwootAccountId: string;
    chatwootInboxId?: string | null;
    chatwootInboxIdentifier?: string | null;
    excludeId?: string;
  }): Promise<Pick<IntegrationConnectionRecord, 'id' | 'name' | 'companyId'> | null> {
    const row = await this.integrationConnectionTable().findFirst({
      where: {
        status: 'ACTIVE',
        chatwootUrl: input.chatwootUrl,
        chatwootAccountId: input.chatwootAccountId,
        ...(input.chatwootInboxId
          ? { chatwootInboxId: input.chatwootInboxId }
          : { chatwootInboxIdentifier: input.chatwootInboxIdentifier || null }),
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: { id: true, name: true, companyId: true },
    });

    return (row as Pick<IntegrationConnectionRecord, 'id' | 'name' | 'companyId'> | null) ?? null;
  }

  private integrationConnectionTable() {
    return (this.prisma as any).integrationConnection;
  }
}
