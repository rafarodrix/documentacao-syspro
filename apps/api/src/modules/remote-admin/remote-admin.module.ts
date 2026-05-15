import { Module } from '@nestjs/common';
import { RemoteAdminController } from './remote-admin.controller';
import { RemotePortalController } from './remote-portal.controller';
import { RemotePublicController } from './remote-public.controller';
import { RemoteAdminService } from './remote-admin.service';
import { RemotePublicService } from './remote-public.service';
import { RemoteAdminRouter } from './remote-admin.router';
import { TrpcCoreModule } from '../trpc/trpc-core.module';

@Module({
  imports: [TrpcCoreModule],
  controllers: [RemoteAdminController, RemotePortalController, RemotePublicController],
  providers: [RemoteAdminService, RemotePublicService, RemoteAdminRouter],
  exports: [RemoteAdminService, RemoteAdminRouter],
})
export class RemoteAdminModule {}
