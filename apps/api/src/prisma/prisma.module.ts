import { Global, Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { prisma } from '@dosc-syspro/database';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useValue: prisma,
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaModule.name);

  async onModuleInit() {
    try {
      await prisma.$connect();
      this.logger.log('Conectado ao Prisma via @dosc-syspro/database');
    } catch (e) {
      this.logger.error('Falha ao conectar usando Prisma', e);
      throw e;
    }
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
    this.logger.log('Desconectado do Prisma');
  }
}
