import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CrmService } from './crm.service';

@Controller('crm/leads')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('stage') stage?: string,
    @Query('source') source?: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.crmService.listLeads({ q, stage, source, ownerUserId, page, pageSize }, req.headers);
  }

  @Get('/support-data')
  getSupportData(@Req() req: Request) {
    return this.crmService.getSupportData(req.headers);
  }

  @Get(':id')
  getById(@Req() req: Request, @Param('id') id: string) {
    return this.crmService.getLeadById(id, req.headers);
  }

  @Post()
  create(@Req() req: Request, @Body() body: Record<string, unknown>) {
    return this.crmService.createLead(body, req.headers);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.crmService.updateLead(id, body, req.headers);
  }
}
