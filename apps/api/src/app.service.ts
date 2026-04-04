import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealthcheck() {
    // Validação real de conexão no pool do NestJS
    const sefazCount = await this.prisma.sefazStatus.count().catch(() => 0);

    return {
      status: 'ok',
      service: '@dosc-syspro/app-api',
      framework: 'NestJS',
      dbRecordsCount: sefazCount,
      timestamp: new Date().toISOString()
    };
  }
}
