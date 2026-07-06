import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationConnectionsService } from './integration-connections.service';

@Injectable()
export class SettingsIntegrationConnectionsAdminService {
  constructor(
    private readonly integrationConnections: IntegrationConnectionsService,
  ) {}

  async list(companyId?: string) {
    const rows = await this.integrationConnections.list(companyId?.trim() || undefined);
    return { success: true, data: rows };
  }

  async getById(id: string) {
    const row = await this.integrationConnections.getById(id);
    if (!row) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: row };
  }

  async create(body: any) {
    const created = await this.integrationConnections.create(body);
    return { success: true, data: created };
  }

  async update(id: string, body: any) {
    const updated = await this.integrationConnections.update(id, body);
    if (!updated) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: updated };
  }

  async remove(id: string) {
    await this.integrationConnections.remove(id);
    return { success: true };
  }

  async test(id: string) {
    const result = await this.integrationConnections.test(id);
    if (!result) throw new NotFoundException('Integracao nao encontrada');
    return { success: true, data: result };
  }
}
