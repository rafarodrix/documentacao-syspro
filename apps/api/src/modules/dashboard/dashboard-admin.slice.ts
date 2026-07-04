import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { DashboardDailyPassword, DashboardResponse } from '@dosc-syspro/contracts/dashboard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { getLast7DaysRange, toSeries } from './dashboard.shared';
import {
  buildCrmSummary,
  type DashboardRequester,
  DashboardSupportService,
  mergeTicketWarnings,
  summarizeActiveContracts,
} from './dashboard.support';

@Injectable()
export class DashboardAdminSliceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly dashboardSupport: DashboardSupportService,
  ) {}

  async buildDashboard(
    rawHeaders: IncomingHttpHeaders | undefined,
    requester: DashboardRequester,
    dailyPassword: DashboardDailyPassword | null,
  ): Promise<DashboardResponse> {
    const dashboardUFs = await this.dashboardSupport.getUserDashboardUFs(requester.userId);
    const { start } = getLast7DaysRange();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      canViewCompaniesModule,
      canViewContactsDirect,
      canViewContactsScoped,
      canViewContactsGlobal,
      canViewUsersDirect,
      canViewUsersScoped,
      canViewUsersGlobal,
      companyScope,
      contactScope,
      userScope,
      canViewCrm,
      dashboardTicketTeam,
      sefazData,
    ] = await Promise.all([
      this.authorizationService.userHasPermission(requester, 'companies:view', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'contacts:view', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'contacts:view_team', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'contacts:view_all'),
      this.authorizationService.userHasPermission(requester, 'users:view', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'users:view_team', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'users:view_all'),
      this.authorizationService.resolveCompanyAccessScope(requester, 'companies:view_own', 'companies:view_all'),
      this.authorizationService.resolveCompanyAccessScope(requester, 'contacts:view_team', 'contacts:view_all'),
      this.authorizationService.resolveCompanyAccessScope(requester, 'users:view_team', 'users:view_all'),
      this.dashboardSupport.canViewDashboardCrm(requester),
      this.dashboardSupport.getDashboardTicketTeam(requester),
      this.dashboardSupport.fetchSefazStatusData(dashboardUFs),
    ]);

    const canViewContactsModule = canViewContactsDirect || canViewContactsScoped || canViewContactsGlobal;
    const canViewUsersModule = canViewUsersGlobal || canViewUsersScoped || canViewUsersDirect;
    const scopedCompanyIds = companyScope.isGlobal ? undefined : companyScope.companyIds;
    const scopedContactIds = contactScope.isGlobal ? undefined : contactScope.companyIds;
    const scopedUserIds = userScope.isGlobal ? undefined : userScope.companyIds;
    const companyBaseWhere = this.dashboardSupport.buildScopedCompaniesWhere(scopedCompanyIds);
    const contractsBaseWhere = this.dashboardSupport.buildScopedContractsWhere(scopedCompanyIds);
    const userBaseWhere = this.dashboardSupport.buildScopedUsersWhere(scopedUserIds);

    const [
      companiesCount,
      companiesThisMonth,
      companiesLastMonth,
      usersCount,
      activeUsersCount,
      contactsCount,
      recentCompanies,
      recentContacts,
      recentUsers,
      companyActivity,
      crmLeads,
      activeContracts,
      usersThisMonth,
      contactsThisMonth,
      inactivatedCompaniesThisMonth,
      inactivatedUsersThisMonth,
      inactivatedContactsThisMonth,
      recentInactivatedCompanies,
      recentInactivatedUsers,
      recentInactivatedContacts,
      ticketData,
    ] = await Promise.all([
      canViewCompaniesModule
        ? this.prisma.company.count({ where: { ...companyBaseWhere, status: 'ACTIVE' } })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.count({
            where: { ...companyBaseWhere, createdAt: { gte: monthStart } },
          })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.count({
            where: {
              ...companyBaseWhere,
              createdAt: {
                gte: previousMonthStart,
                lt: monthStart,
              },
            },
          })
        : Promise.resolve(0),
      this.prisma.user.count({ where: userBaseWhere }),
      this.prisma.user.count({ where: { ...userBaseWhere, isActive: true } }),
      canViewContactsModule
        ? this.prisma.companyContactCompanyLink.count({
            where: scopedContactIds ? { companyId: { in: scopedContactIds } } : undefined,
          })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.findMany({
            where: companyBaseWhere,
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpj: true,
              status: true,
              createdAt: true,
              _count: { select: { memberships: true } },
              contactLinks: { select: { id: true } },
              addresses: { take: 1, select: { cidade: true, estado: true } },
            },
          })
        : Promise.resolve([]),
      canViewContactsModule
        ? (this.prisma.companyContact as any).findMany({
            where: scopedContactIds
              ? {
                  status: { not: 'ARCHIVED' },
                  companyLinks: { some: { companyId: { in: scopedContactIds } } },
                }
              : { status: { not: 'ARCHIVED' } },
            orderBy: [{ createdAt: 'desc' }],
            take: 5,
            select: {
              id: true,
              name: true,
              email: true,
              whatsapp: true,
              createdAt: true,
              companyLinks: {
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: {
                  company: {
                    select: {
                      nomeFantasia: true,
                      razaoSocial: true,
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      canViewUsersModule
        ? this.prisma.user.findMany({
            where: userBaseWhere,
            orderBy: [{ createdAt: 'desc' }],
            take: 5,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              memberships: {
                orderBy: [{ createdAt: 'asc' }],
                select: {
                  company: {
                    select: {
                      nomeFantasia: true,
                      razaoSocial: true,
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      canViewCompaniesModule
        ? this.prisma.company.findMany({
            where: { ...companyBaseWhere, createdAt: { gte: start } },
            select: { createdAt: true },
          })
        : Promise.resolve([]),
      canViewCrm
        ? (this.prisma as any).crmLead
            .findMany({
              select: {
                stage: true,
                estimatedValue: true,
                expectedCloseAt: true,
                nextStep: true,
              },
            })
            .catch(() => [])
        : Promise.resolve([]),
      canViewCrm
        ? this.prisma.contract
            .findMany({
              where: { status: 'ACTIVE', ...contractsBaseWhere },
              select: { totalValue: true, minimumWage: true, percentage: true, taxRate: true, programmerRate: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      this.prisma.user.count({ where: { ...userBaseWhere, createdAt: { gte: monthStart } } }),
      canViewContactsModule
        ? (this.prisma as any).companyContact.count({
            where: scopedContactIds
              ? {
                  companyLinks: { some: { companyId: { in: scopedContactIds } } },
                  createdAt: { gte: monthStart },
                }
              : { createdAt: { gte: monthStart } },
          })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.count({
            where: {
              ...companyBaseWhere,
              status: { in: ['INACTIVE', 'SUSPENDED'] },
              updatedAt: { gte: monthStart },
            },
          })
        : Promise.resolve(0),
      this.prisma.user.count({ where: { ...userBaseWhere, isActive: false, updatedAt: { gte: monthStart } } }),
      canViewContactsModule
        ? (this.prisma as any).companyContact.count({
            where: scopedContactIds
              ? {
                  status: 'ARCHIVED',
                  companyLinks: { some: { companyId: { in: scopedContactIds } } },
                  updatedAt: { gte: monthStart },
                }
              : { status: 'ARCHIVED', updatedAt: { gte: monthStart } },
          })
        : Promise.resolve(0),
      canViewCompaniesModule
        ? this.prisma.company.findMany({
            where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] } },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpj: true,
              status: true,
              createdAt: true,
              _count: { select: { memberships: true } },
              contactLinks: { select: { id: true } },
              addresses: { take: 1, select: { cidade: true, estado: true } },
            },
          })
        : Promise.resolve([]),
      canViewUsersModule
        ? this.prisma.user.findMany({
            where: { ...userBaseWhere, isActive: false },
            orderBy: [{ updatedAt: 'desc' }],
            take: 5,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
              memberships: {
                orderBy: [{ createdAt: 'asc' }],
                select: {
                  company: {
                    select: {
                      nomeFantasia: true,
                      razaoSocial: true,
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      canViewContactsModule
        ? (this.prisma as any).companyContact.findMany({
            where: scopedContactIds
              ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } } }
              : { status: 'ARCHIVED' },
            orderBy: [{ updatedAt: 'desc' }],
            take: 5,
            select: {
              id: true,
              name: true,
              email: true,
              whatsapp: true,
              createdAt: true,
              companyLinks: {
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: { company: { select: { nomeFantasia: true, razaoSocial: true } } },
              },
            },
          })
        : Promise.resolve([]),
      this.dashboardSupport.fetchDashboardTickets(rawHeaders, 'Consulta de tickets do dashboard', dashboardTicketTeam),
    ]);

    const tickets = ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').slice(0, 5);
    const totalOpen =
      ticketData.ticketsResponse?.success && ticketData.ticketsResponse.statusCounts
        ? ticketData.ticketsResponse.statusCounts.open +
          ticketData.ticketsResponse.statusCounts.development +
          ticketData.ticketsResponse.statusCounts.testing
        : ticketData.normalizedTickets.filter((ticket) => ticket.status !== 'Resolvido').length;

    return {
      success: true,
      data: {
        mode: 'admin',
        dailyPassword,
        ticketWarning: mergeTicketWarnings(ticketData.ticketWarning),
        companiesCount,
        companiesGrowth: companiesThisMonth - companiesLastMonth,
        usersCount,
        activeUsersCount,
        contactsCount,
        canViewCompanies: canViewCompaniesModule,
        canViewContacts: canViewContactsModule,
        canViewUsers: canViewUsersModule || userScope.isGlobal,
        companies: recentCompanies.map((company) => this.dashboardSupport.mapDashboardCompany(company)),
        recentContacts: recentContacts.map((contact: any) => this.dashboardSupport.mapDashboardContact(contact)),
        recentUsers: recentUsers.map((user) => this.dashboardSupport.mapDashboardUser(user)),
        sefazFocusUfs: dashboardUFs,
        sefazStatuses: sefazData.sefazStatuses,
        sefazNationalStatuses: sefazData.sefazNationalStatuses,
        sefazConfiguredRoutes: sefazData.configuredSefazRoutes,
        tickets,
        openTicketRecords: ticketData.openTicketRecords,
        totalOpen,
        activity: toSeries(companyActivity.map((company) => company.createdAt)),
        crm: canViewCrm ? buildCrmSummary(crmLeads) : undefined,
        contracts: canViewCrm ? summarizeActiveContracts(activeContracts) : undefined,
        cadastros: {
          companies: {
            total: companiesCount,
            registeredThisMonth: companiesThisMonth,
            inactivatedThisMonth: inactivatedCompaniesThisMonth,
          },
          contacts: {
            total: contactsCount,
            registeredThisMonth: contactsThisMonth,
            inactivatedThisMonth: inactivatedContactsThisMonth,
          },
          users: {
            total: usersCount,
            registeredThisMonth: usersThisMonth,
            inactivatedThisMonth: inactivatedUsersThisMonth,
          },
          recentInactivatedCompanies: recentInactivatedCompanies.map((company) =>
            this.dashboardSupport.mapDashboardCompany(company),
          ),
          recentInactivatedContacts: recentInactivatedContacts.map((contact: any) =>
            this.dashboardSupport.mapDashboardContact(contact),
          ),
          recentInactivatedUsers: recentInactivatedUsers.map((user) => this.dashboardSupport.mapDashboardUser(user)),
        },
      },
    };
  }
}
