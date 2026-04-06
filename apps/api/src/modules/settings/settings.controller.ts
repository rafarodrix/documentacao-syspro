import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':key')
  async getSetting(@Param('key') key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return { value: setting?.value || '' };
  }

  @Put(':key')
  async setSetting(@Param('key') key: string, @Body('value') value: string) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, description: 'Configuração Global' },
    });
    return { success: true, value: setting.value };
  }
}
