import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { AuthorizationService } from '../../authorization/authorization.service';
import { DashboardSupportService } from '../dashboard.support';

@Injectable()
export class ComercialDashboardQuery {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly dashboardSupport: DashboardSupportService,
  ) {}

  async execute(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const crmAccess = await this.dashboardSupport.resolveDashboardCrmAccess(requester);

    if (!crmAccess.canViewCrm) {
      return { success: true as const, data: { crm: undefined, contracts: undefined } };
    }
    const [crm, contracts] = await Promise.all([
      this.dashboardSupport.loadCrmSummary(),
      this.dashboardSupport.loadScopedContractsSummary(crmAccess.scopedCompanyIds),
    ]);

    return {
      success: true as const,
      data: {
        crm,
        contracts,
      },
    };
  }
}
