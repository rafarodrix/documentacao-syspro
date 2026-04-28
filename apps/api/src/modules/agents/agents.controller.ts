import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('register')
  register(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.agentsService.register(internalApiKey, body);
  }

  @Post('heartbeat')
  heartbeat(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.agentsService.heartbeat(internalApiKey, body);
  }

  @Get('stats')
  getFleetStats(@Req() req: Request) {
    return this.agentsService.getFleetStats(req.headers as Record<string, unknown>);
  }

  @Get()
  listDevices(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
    @Query('remoteHostId') remoteHostId?: string,
  ) {
    return this.agentsService.listDevices(req.headers as Record<string, unknown>, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      status: status === 'online' || status === 'offline' ? status : 'all',
      companyId,
      remoteHostId,
    });
  }

  @Get(':deviceId')
  getDevice(@Req() req: Request, @Param('deviceId') deviceId: string) {
    return this.agentsService.getDevice(req.headers as Record<string, unknown>, deviceId);
  }

  @Get(':deviceId/desired-state')
  desiredState(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Param('deviceId') deviceId: string,
  ) {
    return this.agentsService.getDesiredState(internalApiKey, deviceId);
  }
}
