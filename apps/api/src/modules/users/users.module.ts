import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserContactAccessService } from './user-contact-access.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, ChatwootModule, SettingsModule],
  controllers: [UsersController],
  providers: [UsersService, UserContactAccessService],
})
export class UsersModule {}
