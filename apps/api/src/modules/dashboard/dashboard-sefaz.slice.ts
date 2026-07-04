import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { AuthorizationService } from '../authorization/authorization.service';
import { DashboardSupportService } from './dashboard.support';

@Injectable()
export class DashboardSefazSliceService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly dashboardSupport: DashboardSupportService,
  ) {}

  async getStatus(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');
    const dashboardUFs = await this.dashboardSupport.getUserDashboardUFs(requester.userId);
    const sefazData = await this.dashboardSupport.fetchSefazStatusData(dashboardUFs);

    return {
      success: true as const,
      data: {
        focusUfs: dashboardUFs,
        sefazStatuses: sefazData.sefazStatuses,
        sefazNationalStatuses: sefazData.sefazNationalStatuses,
        sefazConfiguredRoutes: sefazData.configuredSefazRoutes,
      },
    };
  }
}
