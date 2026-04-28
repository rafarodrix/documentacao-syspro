import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserContactAccessService } from './user-contact-access.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { SettingsModule } from '../settings/settings.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [PrismaModule, ChatwootModule, SettingsModule, ContactsModule],
  controllers: [UsersController],
  providers: [UsersService, UserContactAccessService],
})
export class UsersModule {}
