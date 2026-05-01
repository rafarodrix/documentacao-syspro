import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RemoteAdminService } from './remote-admin.service';
import type { RemoteSessionStatus } from './support/remote-admin.types';

@Controller('remote-admin')
export class RemoteAdminController {
  constructor(private readonly remoteAdminService: RemoteAdminService) {}

  @Get('directory')
  async getDirectory(@Req() req: Request) {
    return this.remoteAdminService.getDirectory(req.headers);
  }

  @Get('overview')
  async getOverview(@Req() req: Request) {
    return this.remoteAdminService.getOverview(req.headers);
  }

  @Get('hosts/:id/details')
  async getHostDetails(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.getHostDetails(id, req.headers);
  }

  @Get('sessions')
  async getSessions(
    @Req() req: Request,
    @Query('status') status?: RemoteSessionStatus | 'ACTIVE',
    @Query('hostId') hostId?: string,
    @Query('ticket') ticket?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.remoteAdminService.getSessions(req.headers, {
      status,
      hostId,
      ticket,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('reports/efficiency')
  async getEfficiency(@Req() req: Request) {
    return this.remoteAdminService.getEfficiencyMetrics(req.headers);
  }

  @Get('hosts/fleet-stats')
  async getFleetStats(@Req() req: Request) {
    return this.remoteAdminService.getFleetStats(req.headers);
  }

  @Patch('companies/:id/context')
  async updateCompanyContext(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.remoteAdminService.updateCompanyContext(id, (body ?? {}) as any, req.headers);
  }

  @Patch('companies/:id/observacoes')
  async updateCompanyObservacoes(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.remoteAdminService.updateCompanyObservacoes(id, (body ?? {}) as any, req.headers);
  }

  @Post('hosts/:id/actions')
  async postHostAction(@Req() req: Request, @Param('id') id: string, @Body() body: { action?: 'REBOOTSTRAP' | 'RESEND_CONFIG' | 'REAPPLY_ALIAS' }) {
    const action = body?.action;
    if (action !== 'REBOOTSTRAP' && action !== 'RESEND_CONFIG' && action !== 'REAPPLY_ALIAS') {
      return { success: false, error: 'Acao remota invalida.' };
    }
    return this.remoteAdminService.enqueueHostAction(id, action, req.headers);
  }
}
