import { Injectable } from '@nestjs/common';
import { IntegrationConnectionsRepository } from './integration-connections.repository';
import { IntegrationConnectionsMapperService } from './integration-connections.mapper.service';
import { IntegrationConnectionsValidatorService } from './integration-connections-validator.service';
import { IntegrationConnectionsTesterService } from './integration-connections-tester.service';
import type { IntegrationConnectionUpsertInput } from './integration-connections.types';

@Injectable()
export class IntegrationConnectionsService {
  constructor(
    private readonly integrationConnectionsRepository: IntegrationConnectionsRepository,
    private readonly integrationConnectionsMapper: IntegrationConnectionsMapperService,
    private readonly integrationConnectionsValidator: IntegrationConnectionsValidatorService,
    private readonly integrationConnectionsTester: IntegrationConnectionsTesterService,
  ) {}

  async list(companyId?: string) {
    const rows = await this.integrationConnectionsRepository.list(companyId);
    return rows.map((row) => this.integrationConnectionsMapper.toOutput(row));
  }

  async getById(id: string) {
    const row = await this.integrationConnectionsRepository.findById(id);
    if (!row) return null;
    return this.integrationConnectionsMapper.toOutput(row);
  }

  async create(input: IntegrationConnectionUpsertInput) {
    await this.integrationConnectionsValidator.validateInput(input);
    const created = await this.integrationConnectionsRepository.create(
      this.integrationConnectionsMapper.toDatabaseInput(input),
    );
    return this.integrationConnectionsMapper.toOutput(created);
  }

  async update(id: string, input: Partial<IntegrationConnectionUpsertInput>) {
    const current = await this.integrationConnectionsRepository.findById(id);
    if (!current) return null;

    const merged = this.integrationConnectionsMapper.mergeForUpdate(current, input);

    await this.integrationConnectionsValidator.validateInput(merged, id);
    const updated = await this.integrationConnectionsRepository.update(
      id,
      this.integrationConnectionsMapper.toDatabaseInput(merged),
    );
    return this.integrationConnectionsMapper.toOutput(updated);
  }

  async remove(id: string) {
    await this.integrationConnectionsRepository.remove(id);
    return { success: true };
  }

  async test(id: string) {
    const row = await this.integrationConnectionsRepository.findById(id);
    if (!row) return null;
    return this.integrationConnectionsTester.testConnection(row);
  }
}
