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
  type CrmLeadManualContact,
  crmLeadUpdateSchema,
  type CrmLeadCreateInput,
  type CrmLeadUpdateInput,
} from '@dosc-syspro/contracts/crm';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

type NormalizedLeadPayload = {
  title: string;
  stage: CrmLeadCreateInput['stage'];
  source: CrmLeadCreateInput['source'];
  ownerUserId: string | null;
  companyName: string;
  tradeName: string | null;
  document: string | null;
  contacts: CrmLeadManualContact[];
  industry: string | null;
  companySize: string | null;
  city: string | null;
  state: string | null;
  estimatedValue: number | null;
  licenseValue: number | null;
  monthlyFee: number | null;
  minimumWagePercentage: number | null;
  expectedCloseAt: Date | null;
  nextStep: string | null;
  qualificationNotes: string | null;
  lostReason: string | null;
};

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
        { city: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters.stage) where.stage = filters.stage;
    if (filters.source) where.source = filters.source;
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;

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

  async getSupportData(rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const contacts = await (this.prisma as any).companyContact.findMany({
      where: {
        status: { not: 'ARCHIVED' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        companyLinks: {
          select: {
            company: {
              select: {
                razaoSocial: true,
                nomeFantasia: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ name: 'asc' }],
      take: 100,
    });

    return {
      success: true,
      data: {
        contacts: contacts.map((contact: any) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          whatsapp: contact.whatsapp ?? null,
          companies: (contact.companyLinks ?? [])
            .map((link: any) => link.company?.nomeFantasia || link.company?.razaoSocial)
            .filter(Boolean),
        })),
      },
    };
  }

  async createLead(input: Record<string, unknown>, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertSystemAccess(rawHeaders);
    const payload = this.normalizeCreatePayload(crmLeadCreateSchema.parse(input));
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
    const contacts = this.normalizeContactsArray(lead.contacts);
    const primaryContact =
      contacts.find((contact) => contact.isPrimary) ??
      contacts[0] ??
      null;

    return {
      id: lead.id,
      title: lead.title,
      stage: lead.stage,
      source: lead.source,
      ownerUserId: lead.ownerUserId ?? null,
      ownerName: lead.ownerUser?.name || lead.ownerUser?.email || null,
      companyName: lead.companyName,
      tradeName: lead.tradeName ?? null,
      document: lead.document ?? null,
      contacts,
      primaryContactName: primaryContact?.name ?? lead.contactName ?? null,
      industry: lead.industry ?? null,
      companySize: lead.companySize ?? null,
      city: lead.city ?? null,
      state: lead.state ?? null,
      estimatedValue: lead.estimatedValue == null ? null : Number(lead.estimatedValue),
      licenseValue: lead.licenseValue == null ? null : Number(lead.licenseValue),
      monthlyFee: lead.monthlyFee == null ? null : Number(lead.monthlyFee),
      minimumWagePercentage:
        lead.minimumWagePercentage == null ? null : Number(lead.minimumWagePercentage),
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

  private normalizeCreatePayload(input: CrmLeadCreateInput): NormalizedLeadPayload {
    return {
      title: input.title.trim(),
      stage: input.stage,
      source: input.source,
      ownerUserId: this.normalizeString(input.ownerUserId),
      companyName: input.companyName.trim(),
      tradeName: this.normalizeString(input.tradeName),
      document: this.normalizeDocument(input.document),
      contacts: this.normalizeContacts(input.contacts),
      industry: this.normalizeString(input.industry),
      companySize: this.normalizeString(input.companySize),
      city: this.normalizeString(input.city),
      state: this.normalizeState(input.state),
      estimatedValue: input.estimatedValue ?? null,
      licenseValue: input.licenseValue ?? null,
      monthlyFee: input.monthlyFee ?? null,
      minimumWagePercentage: input.minimumWagePercentage ?? null,
      expectedCloseAt: this.normalizeDate(input.expectedCloseAt),
      nextStep: this.normalizeString(input.nextStep),
      qualificationNotes: this.normalizeString(input.qualificationNotes),
      lostReason: this.normalizeString(input.lostReason),
    };
  }

  private normalizeUpdatePayload(input: CrmLeadUpdateInput): Partial<NormalizedLeadPayload> {
    const payload: Partial<NormalizedLeadPayload> = {};

    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.stage !== undefined) payload.stage = input.stage;
    if (input.source !== undefined) payload.source = input.source;
    if (input.ownerUserId !== undefined) payload.ownerUserId = this.normalizeString(input.ownerUserId);
    if (input.companyName !== undefined) payload.companyName = input.companyName.trim();
    if (input.tradeName !== undefined) payload.tradeName = this.normalizeString(input.tradeName);
    if (input.document !== undefined) payload.document = this.normalizeDocument(input.document);
    if (input.contacts !== undefined) payload.contacts = this.normalizeContacts(input.contacts);
    if (input.industry !== undefined) payload.industry = this.normalizeString(input.industry);
    if (input.companySize !== undefined) payload.companySize = this.normalizeString(input.companySize);
    if (input.city !== undefined) payload.city = this.normalizeString(input.city);
    if (input.state !== undefined) payload.state = this.normalizeState(input.state);
    if (input.estimatedValue !== undefined) payload.estimatedValue = input.estimatedValue ?? null;
    if (input.licenseValue !== undefined) payload.licenseValue = input.licenseValue ?? null;
    if (input.monthlyFee !== undefined) payload.monthlyFee = input.monthlyFee ?? null;
    if (input.minimumWagePercentage !== undefined) {
      payload.minimumWagePercentage = input.minimumWagePercentage ?? null;
    }
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

  private normalizeContacts(value?: CrmLeadManualContact[] | null) {
    return (value ?? [])
      .map((contact) => ({
        name: String(contact.name ?? '').trim(),
        role: this.normalizeString(contact.role),
        email: this.normalizeString(contact.email),
        phone: this.normalizeString(contact.phone),
        whatsapp: this.normalizeString(contact.whatsapp),
        isPrimary: Boolean(contact.isPrimary),
      }))
      .filter((contact) => contact.name);
  }

  private normalizeContactsArray(value: unknown): CrmLeadManualContact[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((contact) => {
        if (!contact || typeof contact !== 'object') return null;
        const record = contact as Record<string, unknown>;
        const name = String(record.name ?? '').trim();
        if (!name) return null;
        return {
          name,
          role: this.normalizeString(record.role as string | null | undefined),
          email: this.normalizeString(record.email as string | null | undefined),
          phone: this.normalizeString(record.phone as string | null | undefined),
          whatsapp: this.normalizeString(record.whatsapp as string | null | undefined),
          isPrimary: Boolean(record.isPrimary),
        };
      })
      .filter(Boolean) as CrmLeadManualContact[];
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
