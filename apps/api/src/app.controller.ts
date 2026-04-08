import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHealthcheck() {
    return await this.appService.getHealthcheck();
  }

  @Get('integrations/chatwoot')
  async getChatwootIntegrationHealth() {
    return await this.appService.getChatwootIntegrationHealth();
  }
}
