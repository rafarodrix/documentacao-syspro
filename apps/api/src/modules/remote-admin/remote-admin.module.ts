import { Module } from '@nestjs/common';
import { RemoteAdminController } from './remote-admin.controller';
import { RemotePublicController } from './remote-public.controller';
import { RemoteAdminService } from './remote-admin.service';
import { RemotePublicService } from './remote-public.service';

@Module({
  controllers: [RemoteAdminController, RemotePublicController],
  providers: [RemoteAdminService, RemotePublicService],
  exports: [RemoteAdminService],
})
export class RemoteAdminModule {}
