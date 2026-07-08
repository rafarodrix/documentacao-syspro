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
  crmActivityCreateSchema,
  crmTaskCreateSchema,
  crmTaskUpdateSchema,
  type CrmActivityCreateInput,
  type CrmTaskCreateInput,
  type CrmTaskUpdateInput,
  type CrmProposalSaveInput,
} from '@dosc-syspro/contracts/crm';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import { leadInclude, serializeLead, normalizeContactsArray } from '@dosc-syspro/crm-domain';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { CompaniesService } from '../companies/companies.service';
import { onlyDigits } from '@dosc-syspro/shared';

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
    private readonly companiesService: CompaniesService,
  ) {}

  async listLeads(input: Record<string, unknown>, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);
    const filters = crmLeadListFiltersSchema.parse(input);
    const where: any = {};
    const wantsPagination = filters.page !== undefined || filters.pageSize !== undefined;
    const page = this.parsePage(filters.page);
    const pageSize = this.parsePageSize(filters.pageSize);

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { companyName: { contains: filters.q, mode: 'insensitive' } },
        { tradeName: { contains: filters.q, mode: 'insensitive' } },
        { city: { contains: filters.q, mode: 'insensitive' } },
        { nextStep: { contains: filters.q, mode: 'insensitive' } },
        { lostReason: { contains: filters.q, mode: 'insensitive' } },
        { ownerUser: { name: { contains: filters.q, mode: 'insensitive' } } },
      ];
    }

    if (filters.stage) where.stage = filters.stage;
    if (filters.source) where.source = filters.source;
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;

    const [leads, total] = await Promise.all([
      (this.prisma as any).crmLead.findMany({
        where,
        include: leadInclude(),
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        ...(wantsPagination ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      wantsPagination ? (this.prisma as any).crmLead.count({ where }) : Promise.resolve(0),
    ]);

    return {
      success: true,
      data: leads.map((lead: any) => serializeLead(lead)),
      ...(wantsPagination ? { pagination: buildPaginationMeta({ page, pageSize, total }) } : {}),
    };
  }

  async getLeadById(id: string, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const lead = await (this.prisma as any).crmLead.findUnique({
      where: { id },
      include: leadInclude(),
    });

    if (!lead) {
      throw new NotFoundException('Lead nao encontrado.');
    }

    return {
      success: true,
      data: serializeLead(lead),
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

  async getSummary(rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const stageGroups = await (this.prisma as any).crmLead.groupBy({
      by: ['stage'],
      _count: true,
      _sum: { estimatedValue: true },
    });

    const activeLeads = await (this.prisma as any).crmLead.findMany({
      where: { stage: { notIn: ['WON', 'LOST'] } },
      select: { expectedCloseAt: true, nextStep: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCount = activeLeads.filter(
      (l: any) => l.expectedCloseAt && new Date(l.expectedCloseAt) < today,
    ).length;

    const noNextStepCount = activeLeads.filter((l: any) => !String(l.nextStep ?? '').trim()).length;

    return {
      success: true,
      data: {
        stageCounts: stageGroups.reduce((acc: any, curr: any) => {
          acc[curr.stage] = curr._count;
          return acc;
        }, {}),
        stageValues: stageGroups.reduce((acc: any, curr: any) => {
          acc[curr.stage] = Number(curr._sum.estimatedValue ?? 0);
          return acc;
        }, {}),
        overdueCount,
        noNextStepCount,
      },
    };
  }

  async searchContacts(q: string, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const contacts = await (this.prisma as any).companyContact.findMany({
      where: {
        status: { not: 'ARCHIVED' },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { companyLinks: { some: { company: { razaoSocial: { contains: q, mode: 'insensitive' } } } } },
              ],
            }
          : {}),
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
      take: 50,
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
      include: leadInclude(),
    });

    return {
      success: true,
      data: serializeLead(lead),
      message: 'Lead criado com sucesso.',
    };
  }

  async updateLead(id: string, input: Record<string, unknown>, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const existing = await (this.prisma as any).crmLead.findUnique({
      where: { id },
      select: { 
        id: true, 
        stage: true, 
        document: true, 
        companyName: true, 
        tradeName: true, 
        contacts: true, 
        city: true, 
        state: true, 
        convertedCompanyId: true 
      },
    });

    if (!existing) {
      throw new NotFoundException('Lead nao encontrado.');
    }

    const payload = this.normalizeUpdatePayload(crmLeadUpdateSchema.parse(input));
    if (!Object.keys(payload).length) {
      throw new BadRequestException('Nenhum campo valido informado para atualizar.');
    }

    await this.assertOwnerExists(payload.ownerUserId);

    let convertedCompanyId = existing.convertedCompanyId;

    const currentStage = payload.stage ?? existing.stage;
    const isNewWon = currentStage === 'WON' && existing.stage !== 'WON';
    const document = payload.document !== undefined ? payload.document : existing.document;
    
    if (currentStage === 'WON' && !convertedCompanyId && document) {
      const cleanCnpj = onlyDigits(document);
      if (cleanCnpj.length === 14) {
        let existingCompany = await this.prisma.company.findUnique({
          where: { cnpj: cleanCnpj },
          select: { id: true }
        });
        
        if (!existingCompany) {
          const companyName = payload.companyName ?? existing.companyName;
          const tradeName = payload.tradeName ?? existing.tradeName;
          const city = payload.city ?? existing.city;
          const state = payload.state ?? existing.state;
          const contactsRaw = payload.contacts !== undefined ? payload.contacts : existing.contacts;
          const contactsList = normalizeContactsArray(contactsRaw);
          const primaryContact = contactsList.find(c => c.isPrimary) || contactsList[0];

          const createResult = await this.companiesService.createCompany({
            data: {
              cnpj: cleanCnpj,
              razaoSocial: companyName,
              nomeFantasia: tradeName || companyName,
              telefone: primaryContact?.phone || primaryContact?.whatsapp || undefined,
              emailContato: primaryContact?.email || undefined,
              status: 'ACTIVE',
              address: city && state && state.length === 2 ? {
                description: 'Sede',
                cep: '00000000',
                logradouro: 'A definir',
                numero: 'S/N',
                bairro: 'Centro',
                cidade: city,
                estado: state.toUpperCase().slice(0, 2),
                pais: 'BR'
              } : undefined
            } as any
          }, rawHeaders);

          if (createResult.success) {
            existingCompany = await this.prisma.company.findUnique({
              where: { cnpj: cleanCnpj },
              select: { id: true }
            });
          }
        }

        if (existingCompany) {
          convertedCompanyId = existingCompany.id;
          
          const contactsRaw = payload.contacts !== undefined ? payload.contacts : existing.contacts;
          const contactsList = normalizeContactsArray(contactsRaw);
          for (const leadContact of contactsList) {
            let contact = await this.prisma.companyContact.findFirst({
              where: {
                OR: [
                  leadContact.email ? { email: leadContact.email } : undefined,
                  leadContact.whatsapp ? { whatsapp: leadContact.whatsapp } : undefined,
                  leadContact.phone ? { phone: leadContact.phone } : undefined,
                ].filter(Boolean) as any
              }
            });

            if (!contact) {
              contact = await this.prisma.companyContact.create({
                data: {
                  name: leadContact.name,
                  email: leadContact.email || null,
                  phone: leadContact.phone || null,
                  whatsapp: leadContact.whatsapp || null,
                  jobTitle: leadContact.role || null,
                  notes: leadContact.notes || "Criado automaticamente via conversão de Lead no CRM",
                  status: "LINKED",
                  isPrimary: leadContact.isPrimary,
                }
              });
            }

            await this.prisma.companyContactCompanyLink.upsert({
              where: {
                contactId_companyId: {
                  contactId: contact.id,
                  companyId: existingCompany.id
                }
              },
              create: {
                contactId: contact.id,
                companyId: existingCompany.id,
                isPrimary: leadContact.isPrimary
              },
              update: {
                isPrimary: leadContact.isPrimary
              }
            });
          }
        }
      }
    }

    const finalPayload = {
      ...payload,
      convertedCompanyId: convertedCompanyId !== existing.convertedCompanyId ? convertedCompanyId : undefined
    };

    const lead = await (this.prisma as any).crmLead.update({
      where: { id },
      data: finalPayload,
      include: leadInclude(),
    });

    if (isNewWon || (payload.stage && payload.stage !== existing.stage)) {
      await this.prisma.crmActivity.create({
        data: {
          leadId: id,
          type: 'SYSTEM_EVENT',
          title: 'Alteração de Estágio',
          body: `O lead foi movido do estágio "${existing.stage}" para "${currentStage}".`,
        }
      });
    }

    return {
      success: true,
      data: serializeLead(lead),
      message: 'Lead atualizado com sucesso.',
    };
  }

  async listActivities(leadId: string, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);
    const activities = await this.prisma.crmActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        authorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return {
      success: true,
      data: activities.map(act => ({
        id: act.id,
        leadId: act.leadId,
        type: act.type,
        title: act.title,
        body: act.body,
        authorUserId: act.authorUserId,
        authorName: act.authorUser?.name || act.authorUser?.email || null,
        createdAt: act.createdAt.toISOString(),
        updatedAt: act.updatedAt.toISOString(),
      })),
    };
  }

  async createActivity(input: CrmActivityCreateInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertSystemAccess(rawHeaders);
    const valid = crmActivityCreateSchema.parse(input);

    const activity = await this.prisma.crmActivity.create({
      data: {
        leadId: valid.leadId,
        type: valid.type,
        title: valid.title,
        body: valid.body,
        authorUserId: requester.userId,
      },
      include: {
        authorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return {
      success: true,
      data: {
        id: activity.id,
        leadId: activity.leadId,
        type: activity.type,
        title: activity.title,
        body: activity.body,
        authorUserId: activity.authorUserId,
        authorName: activity.authorUser?.name || activity.authorUser?.email || null,
        createdAt: activity.createdAt.toISOString(),
        updatedAt: activity.updatedAt.toISOString(),
      },
      message: 'Nota registrada com sucesso.',
    };
  }

  async listTasks(leadId: string, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);
    const tasks = await this.prisma.crmTask.findMany({
      where: { leadId },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
      ],
      include: {
        assigneeUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return {
      success: true,
      data: tasks.map(task => ({
        id: task.id,
        leadId: task.leadId,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate.toISOString(),
        assigneeUserId: task.assigneeUserId,
        assigneeName: task.assigneeUser?.name || task.assigneeUser?.email || null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    };
  }

  async createTask(input: CrmTaskCreateInput, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);
    const valid = crmTaskCreateSchema.parse(input);

    const task = await this.prisma.crmTask.create({
      data: {
        leadId: valid.leadId,
        title: valid.title,
        description: valid.description,
        status: valid.status,
        dueDate: new Date(valid.dueDate),
        assigneeUserId: valid.assigneeUserId || null,
      },
      include: {
        assigneeUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return {
      success: true,
      data: {
        id: task.id,
        leadId: task.leadId,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate.toISOString(),
        assigneeUserId: task.assigneeUserId,
        assigneeName: task.assigneeUser?.name || task.assigneeUser?.email || null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
      message: 'Tarefa criada com sucesso.',
    };
  }

  async updateTask(id: string, input: CrmTaskUpdateInput, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);
    const valid = crmTaskUpdateSchema.parse(input);

    const existing = await this.prisma.crmTask.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Tarefa não encontrada.');
    }

    const task = await this.prisma.crmTask.update({
      where: { id },
      data: {
        title: valid.title !== undefined ? valid.title : undefined,
        description: valid.description !== undefined ? valid.description : undefined,
        status: valid.status !== undefined ? valid.status : undefined,
        dueDate: valid.dueDate !== undefined ? new Date(valid.dueDate) : undefined,
        assigneeUserId: valid.assigneeUserId !== undefined ? valid.assigneeUserId : undefined,
      },
      include: {
        assigneeUser: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return {
      success: true,
      data: {
        id: task.id,
        leadId: task.leadId,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate.toISOString(),
        assigneeUserId: task.assigneeUserId,
        assigneeName: task.assigneeUser?.name || task.assigneeUser?.email || null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
      message: 'Tarefa atualizada com sucesso.',
    };
  }

  async deleteTask(id: string, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const existing = await this.prisma.crmTask.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Tarefa não encontrada.');
    }

    await this.prisma.crmTask.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Tarefa excluída com sucesso.',
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
    const digits = onlyDigits(value);
    return digits || null;
  }

  private parsePage(value?: string): number {
    const parsed = Number.parseInt(value || '1', 10);
    return Math.max(1, Number.isNaN(parsed) ? 1 : parsed);
  }

  private parsePageSize(value?: string): number {
    const parsed = Number.parseInt(value || '100', 10);
    return Math.min(200, Math.max(1, Number.isNaN(parsed) ? 100 : parsed));
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
        notes: this.normalizeString(contact.notes),
      }))
      .filter((contact) => contact.name);
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

  async getProposalByLeadId(leadId: string, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);
    
    const proposal = await this.prisma.crmProposal.findUnique({
      where: { leadId },
      include: {
        items: true,
      },
    });

    if (!proposal) {
      return null;
    }

    return {
      success: true,
      data: {
        ...proposal,
        setupValue: Number(proposal.setupValue),
        recurringValue: Number(proposal.recurringValue),
        validUntil: proposal.validUntil.toISOString(),
        createdAt: proposal.createdAt.toISOString(),
        updatedAt: proposal.updatedAt.toISOString(),
        items: proposal.items.map(item => ({
          ...item,
          unitPrice: Number(item.unitPrice),
        })),
      },
    };
  }

  async saveProposal(input: CrmProposalSaveInput, rawHeaders?: IncomingHttpHeaders) {
    await this.assertSystemAccess(rawHeaders);

    const lead = await this.prisma.crmLead.findUnique({
      where: { id: input.leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }

    const validUntilDate = new Date(input.validUntil);
    if (Number.isNaN(validUntilDate.getTime())) {
      throw new BadRequestException('Data de validade inválida.');
    }

    const proposal = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.crmProposal.findUnique({
        where: { leadId: input.leadId },
      });

      const nextVersion = existing ? existing.version + 1 : 1;

      if (existing) {
        await tx.crmProposalItem.deleteMany({
          where: { proposalId: existing.id },
        });
        
        const updated = await tx.crmProposal.update({
          where: { id: existing.id },
          data: {
            version: nextVersion,
            setupValue: input.setupValue,
            recurringValue: input.recurringValue,
            validUntil: validUntilDate,
            items: {
              create: input.items.map((item) => ({
                serviceName: item.serviceName,
                quantityLimit: item.quantityLimit,
                unitPrice: item.unitPrice,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        return updated;
      } else {
        const created = await tx.crmProposal.create({
          data: {
            leadId: input.leadId,
            version: 1,
            status: 'DRAFT',
            setupValue: input.setupValue,
            recurringValue: input.recurringValue,
            validUntil: validUntilDate,
            items: {
              create: input.items.map((item) => ({
                serviceName: item.serviceName,
                quantityLimit: item.quantityLimit,
                unitPrice: item.unitPrice,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        return created;
      }
    });

    await this.prisma.crmActivity.create({
      data: {
        leadId: input.leadId,
        type: 'SYSTEM_EVENT',
        title: 'Proposta Comercial Atualizada',
        body: `A proposta comercial (Versão ${proposal.version}) foi salva com o valor recorrente de R$ ${Number(proposal.recurringValue).toFixed(2)}/mês e taxa de setup de R$ ${Number(proposal.setupValue).toFixed(2)}.`,
      },
    });

    return {
      success: true,
      data: {
        ...proposal,
        setupValue: Number(proposal.setupValue),
        recurringValue: Number(proposal.recurringValue),
        validUntil: proposal.validUntil.toISOString(),
        createdAt: proposal.createdAt.toISOString(),
        updatedAt: proposal.updatedAt.toISOString(),
        items: proposal.items.map(item => ({
          ...item,
          unitPrice: Number(item.unitPrice),
        })),
      },
    };
  }
}
