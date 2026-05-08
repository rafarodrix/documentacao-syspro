import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRouter } from './users.router';
import { UserContactAccessService } from './user-contact-access.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ChatwootModule } from '../integrations/chatwoot/chatwoot.module';
import { SettingsModule } from '../settings/settings.module';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [PrismaModule, ChatwootModule, SettingsModule, ContactsModule],
  providers: [UsersService, UsersRouter, UserContactAccessService],
  exports: [UsersService, UsersRouter],
})
export class UsersModule {}
