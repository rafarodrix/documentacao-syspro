import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';
import { DocsService } from './docs.service';
import { DocsRouter } from './docs.router';

@Module({
  imports: [PrismaModule, AuthModule, TrpcCoreModule],
  providers: [DocsService, DocsRouter],
  exports: [DocsRouter],
})
export class DocsModule {}
