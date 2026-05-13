import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';
import { DocsRouter } from './docs.router';

@Module({
  imports: [PrismaModule, AuthModule, TrpcCoreModule],
  controllers: [DocsController],
  providers: [DocsService, DocsRouter],
  exports: [DocsRouter],
})
export class DocsModule {}
