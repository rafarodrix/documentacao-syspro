import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@Req() req: Request) {
    return this.dashboardService.getDashboard(req.headers);
  }
}
