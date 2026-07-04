import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { AuthorizationService } from '../authorization/authorization.service';

export type TicketRequester = {
  userId: string;
  role: Role;
  email: string;
};

export type TicketAccessScope = {
  isGlobal: boolean;
  companyIds: string[];
};

export type TicketOperatorCapabilities = {
  canRouteDevelopment: boolean;
  canOwnSupportQueue: boolean;
  canOwnDevelopmentQueue: boolean;
};

@Injectable()
export class TicketAccessService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async getTicketAccessScope(requester: TicketRequester): Promise<TicketAccessScope> {
    return this.authorizationService.resolveCompanyAccessScope(
      requester,
      'tickets:view_own',
      'tickets:view_all',
    );
  }

  async assertCanManageTickets(requester: TicketRequester) {
    const canManage = await this.authorizationService.userHasPermission(
      requester,
      'tickets:manage',
      { acceptCompanyScope: true },
    );

    if (!canManage) {
      throw new ForbiddenException('Sem permissao para gerenciar tickets.');
    }
  }

  async getTicketOperatorCapabilities(requester: TicketRequester): Promise<TicketOperatorCapabilities> {
    const [canRouteDevelopment, canOwnSupportQueue, canOwnDevelopmentQueue] = await Promise.all([
      this.authorizationService.userHasPermission(requester, 'tickets:route_development', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'tickets:own_support_queue', { acceptCompanyScope: true }),
      this.authorizationService.userHasPermission(requester, 'tickets:own_development_queue', {
        acceptCompanyScope: true,
      }),
    ]);

    return {
      canRouteDevelopment,
      canOwnSupportQueue,
      canOwnDevelopmentQueue,
    };
  }

  assertTicketAccess(companyId: string | null, accessScope: TicketAccessScope) {
    if (accessScope.isGlobal) {
      return;
    }

    if (!companyId || !accessScope.companyIds.includes(companyId)) {
      throw new NotFoundException('Ticket nao encontrado.');
    }
  }
}
