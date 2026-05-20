import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { TrpcCoreModule } from '../trpc/trpc-core.module';
import { CrmService } from './crm.service';
import { CrmRouter } from './crm.router';

@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule, TrpcCoreModule],
  providers: [CrmService, CrmRouter],
  exports: [CrmService, CrmRouter],
})
export class CrmModule {}
