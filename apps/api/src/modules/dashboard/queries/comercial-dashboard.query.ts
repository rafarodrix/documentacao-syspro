import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthorizationService } from '../../authorization/authorization.service';

function buildCrmSummary(leads: Array<{ stage?: string | null; estimatedValue?: number | null; expectedCloseAt?: Date | null; nextStep?: string | null }>) {
  const stages = {
    newLeads: 0,
    qualified: 0,
    proposal: 0,
    negotiation: 0,
    won: 0,
    lost: 0,
  };

  let pipelineValue = 0;
  let weightedForecast = 0;
  let upcomingClosures = 0;

  for (const lead of leads) {
    const stage = String(lead.stage ?? '').trim().toUpperCase();
    const value = Number(lead.estimatedValue ?? 0);
    const expectedCloseAt = lead.expectedCloseAt instanceof Date ? lead.expectedCloseAt : null;

    switch (stage) {
      case 'NEW':
        stages.newLeads++;
        weightedForecast += value * 0.1;
        break;
      case 'QUALIFIED':
        stages.qualified++;
        weightedForecast += value * 0.25;
        break;
      case 'PROPOSAL':
        stages.proposal++;
        weightedForecast += value * 0.5;
        break;
      case 'NEGOTIATION':
        stages.negotiation++;
        weightedForecast += value * 0.75;
        break;
      case 'WON':
        stages.won++;
        break;
      case 'LOST':
        stages.lost++;
        break;
      default:
        stages.newLeads++;
        weightedForecast += value * 0.1;
        break;
    }

    if (stage !== 'WON' && stage !== 'LOST') {
      pipelineValue += value;
      if (expectedCloseAt && expectedCloseAt >= new Date()) upcomingClosures++;
    }
  }

  return {
    totalLeads: leads.length,
    ...stages,
    pipelineValue,
    weightedForecast,
    upcomingClosures,
  };
}

function summarizeActiveContracts(contracts: Array<{ totalValue?: number | null; minimumWage?: number | null; percentage?: number | null; taxRate?: number | null; programmerRate?: number | null }>) {
  type ContractSummary = {
    totalContracts: number;
    totalValue: number;
    totalMinimumWage: number;
    totalPercentage: number;
    totalTaxRate: number;
    totalProgrammerRate: number;
  };

  return contracts.reduce(
    (acc: ContractSummary, contract) => {
      acc.totalContracts += 1;
      acc.totalValue += Number(contract.totalValue ?? 0);
      acc.totalMinimumWage += Number(contract.minimumWage ?? 0);
      acc.totalPercentage += Number(contract.percentage ?? 0);
      acc.totalTaxRate += Number(contract.taxRate ?? 0);
      acc.totalProgrammerRate += Number(contract.programmerRate ?? 0);
      return acc;
    },
    {
      totalContracts: 0,
      totalValue: 0,
      totalMinimumWage: 0,
      totalPercentage: 0,
      totalTaxRate: 0,
      totalProgrammerRate: 0,
    } satisfies ContractSummary,
  );
}

@Injectable()
export class ComercialDashboardQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async execute(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const canViewCrm =
      (await this.authorizationService.userHasPermission(requester, 'crm:view', { acceptCompanyScope: true })) ||
      (await this.authorizationService.userHasPermission(requester, 'crm:manage', { acceptCompanyScope: true }));

    if (!canViewCrm) {
      return { success: true as const, data: { crm: undefined, contracts: undefined } };
    }

    const companyScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'companies:view_own',
      'companies:view_all',
    );
    const contractsBaseWhere = companyScope.isGlobal
      ? {}
      : { companyId: { in: companyScope.companyIds } };

    const [crmLeads, activeContracts] = await Promise.all([
      (this.prisma as any).crmLead.findMany({
        select: { stage: true, estimatedValue: true, expectedCloseAt: true, nextStep: true },
      }).catch(() => []),
      this.prisma.contract.findMany({
        where: { status: 'ACTIVE', ...contractsBaseWhere },
        select: { totalValue: true, minimumWage: true, percentage: true, taxRate: true, programmerRate: true },
      }).catch(() => []),
    ]);

    return {
      success: true as const,
      data: {
        crm: buildCrmSummary(crmLeads),
        contracts: summarizeActiveContracts(
          activeContracts.map((contract) => ({
            totalValue: Number(contract.totalValue ?? 0),
            minimumWage: Number(contract.minimumWage ?? 0),
            percentage: Number(contract.percentage ?? 0),
            taxRate: Number(contract.taxRate ?? 0),
            programmerRate: Number(contract.programmerRate ?? 0),
          })),
        ),
      },
    };
  }
}
