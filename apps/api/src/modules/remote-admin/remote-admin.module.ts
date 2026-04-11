import { Module } from '@nestjs/common';
import { RemoteAdminController } from './remote-admin.controller';
import { RemoteAdminService } from './remote-admin.service';

@Module({
  controllers: [RemoteAdminController],
  providers: [RemoteAdminService],
  exports: [RemoteAdminService],
})
export class RemoteAdminModule {}
