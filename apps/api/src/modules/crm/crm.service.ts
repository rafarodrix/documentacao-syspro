import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import {
  crmLeadCreateSchema,
  crmLeadListFiltersSchema,
  crmLeadUpdateSchema,
  type CrmLeadCreateInput,
  type CrmLeadUpdateInput,
} from '@dosc-syspro/contracts/crm';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async listLeads(input: Record<string, unknown>, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);
    const filters = crmLeadListFiltersSchema.parse(input);
    const where: any = {};

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { companyName: { contains: filters.q, mode: 'insensitive' } },
        { tradeName: { contains: filters.q, mode: 'insensitive' } },
        { contactName: { contains: filters.q, mode: 'insensitive' } },
        { contactEmail: { contains: filters.q, mode: 'insensitive' } },
        { city: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters.stage) where.stage = filters.stage;
    if (filters.source) where.source = filters.source;
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
    if (filters.contactId) where.contactId = filters.contactId;

    const leads = await (this.prisma as any).crmLead.findMany({
      where,
      include: this.leadInclude(),
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      data: leads.map((lead: any) => this.serializeLead(lead)),
    };
  }

  async getLeadById(id: string, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const lead = await (this.prisma as any).crmLead.findUnique({
      where: { id },
      include: this.leadInclude(),
    });

    if (!lead) {
      throw new NotFoundException('Lead nao encontrado.');
    }

    return {
      success: true,
      data: this.serializeLead(lead),
    };
  }

  async createLead(input: Record<string, unknown>, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertSystemAccess(rawHeaders);
    const payload = this.normalizeCreatePayload(crmLeadCreateSchema.parse(input));
    await this.assertContactExists(payload.contactId);
    await this.assertOwnerExists(payload.ownerUserId);

    const lead = await (this.prisma as any).crmLead.create({
      data: {
        ...payload,
        ownerUserId: payload.ownerUserId ?? requester.userId,
      },
      include: this.leadInclude(),
    });

    return {
      success: true,
      data: this.serializeLead(lead),
      message: 'Lead criado com sucesso.',
    };
  }

  async updateLead(id: string, input: Record<string, unknown>, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const existing = await (this.prisma as any).crmLead.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Lead nao encontrado.');
    }

    const payload = this.normalizeUpdatePayload(crmLeadUpdateSchema.parse(input));
    if (!Object.keys(payload).length) {
      throw new BadRequestException('Nenhum campo valido informado para atualizar.');
    }

    await this.assertContactExists(payload.contactId);
    await this.assertOwnerExists(payload.ownerUserId);

    const lead = await (this.prisma as any).crmLead.update({
      where: { id },
      data: payload,
      include: this.leadInclude(),
    });

    return {
      success: true,
      data: this.serializeLead(lead),
      message: 'Lead atualizado com sucesso.',
    };
  }

  private leadInclude() {
    return {
      ownerUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          whatsapp: true,
        },
      },
      convertedCompany: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
    };
  }

  private serializeLead(lead: any) {
    return {
      id: lead.id,
      title: lead.title,
      stage: lead.stage,
      source: lead.source,
      ownerUserId: lead.ownerUserId ?? null,
      ownerName: lead.ownerUser?.name || lead.ownerUser?.email || null,
      contactId: lead.contactId ?? null,
      contactName: lead.contact?.name || lead.contactName || null,
      contactEmail: lead.contact?.email || lead.contactEmail || null,
      contactPhone: lead.contact?.whatsapp || lead.contact?.phone || lead.contactPhone || null,
      companyName: lead.companyName,
      tradeName: lead.tradeName ?? null,
      document: lead.document ?? null,
      industry: lead.industry ?? null,
      companySize: lead.companySize ?? null,
      city: lead.city ?? null,
      state: lead.state ?? null,
      estimatedValue: lead.estimatedValue == null ? null : Number(lead.estimatedValue),
      expectedCloseAt: lead.expectedCloseAt ? new Date(lead.expectedCloseAt).toISOString() : null,
      nextStep: lead.nextStep ?? null,
      qualificationNotes: lead.qualificationNotes ?? null,
      lostReason: lead.lostReason ?? null,
      convertedCompanyId: lead.convertedCompanyId ?? null,
      convertedCompanyName:
        lead.convertedCompany?.nomeFantasia ||
        lead.convertedCompany?.razaoSocial ||
        null,
      createdAt: new Date(lead.createdAt).toISOString(),
      updatedAt: new Date(lead.updatedAt).toISOString(),
    };
  }

  private normalizeCreatePayload(input: CrmLeadCreateInput) {
    return {
      title: input.title.trim(),
      stage: input.stage,
      source: input.source,
      ownerUserId: this.normalizeString(input.ownerUserId),
      contactId: this.normalizeString(input.contactId),
      contactName: this.normalizeString(input.contactName),
      contactEmail: this.normalizeString(input.contactEmail),
      contactPhone: this.normalizeString(input.contactPhone),
      companyName: input.companyName.trim(),
      tradeName: this.normalizeString(input.tradeName),
      document: this.normalizeDocument(input.document),
      industry: this.normalizeString(input.industry),
      companySize: this.normalizeString(input.companySize),
      city: this.normalizeString(input.city),
      state: this.normalizeState(input.state),
      estimatedValue: input.estimatedValue ?? null,
      expectedCloseAt: this.normalizeDate(input.expectedCloseAt),
      nextStep: this.normalizeString(input.nextStep),
      qualificationNotes: this.normalizeString(input.qualificationNotes),
      lostReason: this.normalizeString(input.lostReason),
    };
  }

  private normalizeUpdatePayload(input: CrmLeadUpdateInput) {
    const payload: Record<string, unknown> = {};

    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.stage !== undefined) payload.stage = input.stage;
    if (input.source !== undefined) payload.source = input.source;
    if (input.ownerUserId !== undefined) payload.ownerUserId = this.normalizeString(input.ownerUserId);
    if (input.contactId !== undefined) payload.contactId = this.normalizeString(input.contactId);
    if (input.contactName !== undefined) payload.contactName = this.normalizeString(input.contactName);
    if (input.contactEmail !== undefined) payload.contactEmail = this.normalizeString(input.contactEmail);
    if (input.contactPhone !== undefined) payload.contactPhone = this.normalizeString(input.contactPhone);
    if (input.companyName !== undefined) payload.companyName = input.companyName.trim();
    if (input.tradeName !== undefined) payload.tradeName = this.normalizeString(input.tradeName);
    if (input.document !== undefined) payload.document = this.normalizeDocument(input.document);
    if (input.industry !== undefined) payload.industry = this.normalizeString(input.industry);
    if (input.companySize !== undefined) payload.companySize = this.normalizeString(input.companySize);
    if (input.city !== undefined) payload.city = this.normalizeString(input.city);
    if (input.state !== undefined) payload.state = this.normalizeState(input.state);
    if (input.estimatedValue !== undefined) payload.estimatedValue = input.estimatedValue ?? null;
    if (input.expectedCloseAt !== undefined) payload.expectedCloseAt = this.normalizeDate(input.expectedCloseAt);
    if (input.nextStep !== undefined) payload.nextStep = this.normalizeString(input.nextStep);
    if (input.qualificationNotes !== undefined) {
      payload.qualificationNotes = this.normalizeString(input.qualificationNotes);
    }
    if (input.lostReason !== undefined) payload.lostReason = this.normalizeString(input.lostReason);

    return payload;
  }

  private normalizeString(value?: string | null) {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : null;
  }

  private normalizeDocument(value?: string | null) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits || null;
  }

  private normalizeState(value?: string | null) {
    const normalized = String(value ?? '').trim().toUpperCase();
    return normalized ? normalized.slice(0, 8) : null;
  }

  private normalizeDate(value?: string | null) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;

    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data prevista de fechamento invalida.');
    }

    return date;
  }

  private async assertContactExists(contactId?: string | null) {
    if (!contactId) return;

    const contact = await (this.prisma as any).companyContact.findUnique({
      where: { id: contactId },
      select: { id: true },
    });

    if (!contact) {
      throw new BadRequestException('Contato vinculado nao encontrado.');
    }
  }

  private async assertOwnerExists(ownerUserId?: string | null) {
    if (!ownerUserId) return;

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { id: true },
    });

    if (!owner) {
      throw new BadRequestException('Responsavel comercial nao encontrado.');
    }
  }

  private async assertSystemAccess(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    if (!this.authorizationService.isSystemRole(requester.role)) {
      throw new ForbiddenException('Modulo CRM disponivel apenas para equipe interna.');
    }
    return requester;
  }
}
