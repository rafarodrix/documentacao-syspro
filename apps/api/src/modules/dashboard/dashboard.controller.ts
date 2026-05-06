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

  @Get('operacional')
  getOperacionalData(@Req() req: Request) {
    return this.dashboardService.getOperacionalData(req.headers);
  }

  @Get('suporte')
  getSuporteData(@Req() req: Request) {
    return this.dashboardService.getSuporteData(req.headers);
  }

  @Get('cadastros')
  getCadastrosData(@Req() req: Request) {
    return this.dashboardService.getCadastrosData(req.headers);
  }

  @Get('comercial')
  getComercialData(@Req() req: Request) {
    return this.dashboardService.getComercialData(req.headers);
  }

  @Get('sefaz')
  getSefazStatus(@Req() req: Request) {
    return this.dashboardService.getSefazStatus(req.headers);
  }
}
