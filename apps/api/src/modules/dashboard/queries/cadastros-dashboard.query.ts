import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthorizationService } from '../../authorization/authorization.service';

@Injectable()
export class CadastrosDashboardQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async execute(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const [
      canViewCompaniesDirect,
      canViewContactsDirect,
      canViewContactsScoped,
      canViewContactsGlobal,
      canViewUsersDirect,
      canViewUsersScoped,
      canViewUsersGlobal,
      companyScope,
      contactScope,
      userScope,
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
    ]);

    const canViewContactsModule = canViewContactsDirect || canViewContactsScoped || canViewContactsGlobal;
    const canViewUsersModule = canViewUsersGlobal || canViewUsersScoped || canViewUsersDirect;

    const fallbackCompanyIds =
      canViewCompaniesDirect || canViewContactsDirect || canViewUsersDirect
        ? await this.authorizationService.getUserCompanyIds(requester)
        : [];

    const scopedCompanyIds = companyScope.isGlobal
      ? undefined
      : companyScope.companyIds.length > 0
        ? companyScope.companyIds
        : canViewCompaniesDirect
          ? fallbackCompanyIds
          : [];
    const scopedContactIds = contactScope.isGlobal
      ? undefined
      : contactScope.companyIds.length > 0
        ? contactScope.companyIds
        : canViewContactsDirect
          ? fallbackCompanyIds
          : [];
    const scopedUserIds = userScope.isGlobal
      ? undefined
      : userScope.companyIds.length > 0
        ? userScope.companyIds
        : canViewUsersDirect
          ? fallbackCompanyIds
          : [];

    const companyBaseWhere = scopedCompanyIds ? { id: { in: scopedCompanyIds }, deletedAt: null } : { deletedAt: null };
    const userBaseWhere = scopedUserIds ? { memberships: { some: { companyId: { in: scopedUserIds } } } } : undefined;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      companiesCount,
      companiesThisMonth,
      inactivatedCompaniesThisMonth,
      usersCount,
      usersThisMonth,
      inactivatedUsersThisMonth,
      contactsCount,
      contactsThisMonth,
      inactivatedContactsThisMonth,
      recentCompanies,
      recentInactivatedCompanies,
      recentContacts,
      recentInactivatedContacts,
      recentUsers,
      recentInactivatedUsers,
    ] = await Promise.all([
      canViewCompaniesDirect ? this.prisma.company.count({ where: { ...companyBaseWhere, status: 'ACTIVE' } }) : Promise.resolve(0),
      canViewCompaniesDirect ? this.prisma.company.count({ where: { ...companyBaseWhere, createdAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewCompaniesDirect ? this.prisma.company.count({ where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] }, updatedAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewUsersModule ? this.prisma.user.count({ where: userBaseWhere }) : Promise.resolve(0),
      canViewUsersModule ? this.prisma.user.count({ where: { ...userBaseWhere, createdAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewUsersModule ? this.prisma.user.count({ where: { ...userBaseWhere, isActive: false, updatedAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewContactsModule ? (this.prisma as any).companyContactCompanyLink.count({ where: scopedContactIds ? { companyId: { in: scopedContactIds } } : undefined }) : Promise.resolve(0),
      canViewContactsModule ? (this.prisma as any).companyContact.count({ where: scopedContactIds ? { companyLinks: { some: { companyId: { in: scopedContactIds } } }, createdAt: { gte: monthStart } } : { createdAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewContactsModule ? (this.prisma as any).companyContact.count({ where: scopedContactIds ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } }, updatedAt: { gte: monthStart } } : { status: 'ARCHIVED', updatedAt: { gte: monthStart } } }) : Promise.resolve(0),
      canViewCompaniesDirect ? this.prisma.company.findMany({ where: companyBaseWhere, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, status: true, createdAt: true, _count: { select: { memberships: true } }, contactLinks: { select: { id: true } }, addresses: { take: 1, select: { cidade: true, estado: true } } } }) : Promise.resolve([]),
      canViewCompaniesDirect ? this.prisma.company.findMany({ where: { ...companyBaseWhere, status: { in: ['INACTIVE', 'SUSPENDED'] } }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, status: true, createdAt: true, _count: { select: { memberships: true } }, contactLinks: { select: { id: true } }, addresses: { take: 1, select: { cidade: true, estado: true } } } }) : Promise.resolve([]),
      canViewContactsModule ? (this.prisma as any).companyContact.findMany({ where: scopedContactIds ? { status: { not: 'ARCHIVED' }, companyLinks: { some: { companyId: { in: scopedContactIds } } } } : { status: { not: 'ARCHIVED' } }, orderBy: [{ createdAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, whatsapp: true, createdAt: true, companyLinks: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
      canViewContactsModule ? (this.prisma as any).companyContact.findMany({ where: scopedContactIds ? { status: 'ARCHIVED', companyLinks: { some: { companyId: { in: scopedContactIds } } } } : { status: 'ARCHIVED' }, orderBy: [{ updatedAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, whatsapp: true, createdAt: true, companyLinks: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
      canViewUsersModule ? this.prisma.user.findMany({ where: userBaseWhere, orderBy: [{ createdAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true, memberships: { orderBy: [{ createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
      canViewUsersModule ? this.prisma.user.findMany({ where: { ...userBaseWhere, isActive: false }, orderBy: [{ updatedAt: 'desc' }], take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true, memberships: { orderBy: [{ createdAt: 'asc' }], select: { company: { select: { nomeFantasia: true, razaoSocial: true } } } } } }) : Promise.resolve([]),
    ]);

    const mapCompany = (company: any) => ({
      id: company.id,
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia,
      cnpj: company.cnpj,
      status: company.status,
      createdAt: company.createdAt.toISOString(),
      membershipsCount: company._count?.memberships ?? 0,
      contactsCount: company.contactLinks?.length ?? 0,
      cidade: company.addresses?.[0]?.cidade ?? null,
      estado: company.addresses?.[0]?.estado ?? null,
    });

    const mapContact = (contact: any) => ({
      id: contact.id,
      name: contact.name?.trim() || contact.email?.trim() || contact.whatsapp?.trim() || 'Contato sem nome',
      email: contact.email ?? null,
      whatsapp: contact.whatsapp ?? null,
      createdAt: contact.createdAt.toISOString(),
      companyNames: Array.from(new Set((contact.companyLinks ?? []).map((l: any) => l.company?.nomeFantasia || l.company?.razaoSocial).filter(Boolean) as string[])),
    });

    const mapUser = (user: any) => ({
      id: user.id,
      name: user.name?.trim() || user.email,
      email: user.email,
      role: String(user.role),
      createdAt: user.createdAt.toISOString(),
      companyNames: Array.from(new Set((user.memberships ?? []).map((m: any) => m.company?.nomeFantasia || m.company?.razaoSocial).filter(Boolean) as string[])),
    });

    return {
      success: true as const,
      data: {
        canViewCompanies: canViewCompaniesDirect,
        canViewContacts: canViewContactsModule,
        canViewUsers: canViewUsersModule || userScope.isGlobal,
        companies: recentCompanies.map(mapCompany),
        recentContacts: recentContacts.map(mapContact),
        recentUsers: recentUsers.map(mapUser),
        companiesCount,
        contactsCount,
        usersCount,
        cadastros: {
          companies: { total: companiesCount, registeredThisMonth: companiesThisMonth, inactivatedThisMonth: inactivatedCompaniesThisMonth },
          contacts: { total: contactsCount, registeredThisMonth: contactsThisMonth, inactivatedThisMonth: inactivatedContactsThisMonth },
          users: { total: usersCount, registeredThisMonth: usersThisMonth, inactivatedThisMonth: inactivatedUsersThisMonth },
          recentInactivatedCompanies: recentInactivatedCompanies.map(mapCompany),
          recentInactivatedContacts: recentInactivatedContacts.map(mapContact),
          recentInactivatedUsers: recentInactivatedUsers.map(mapUser),
        },
      },
    };
  }
}
