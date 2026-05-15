import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { RotinasMensaisRouter } from './rotinas-mensais.router';
import { RotinasMensaisService } from './rotinas-mensais.service';

@Module({
  imports: [PrismaModule, AuthorizationModule, TrpcCoreModule],
  providers: [RotinasMensaisService, RotinasMensaisRouter],
  exports: [RotinasMensaisService, RotinasMensaisRouter],
})
export class RotinasMensaisModule {}
