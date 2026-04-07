import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EvolutionModule } from '../integrations/evolution/evolution.module';

@Module({
  imports: [PrismaModule, EvolutionModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
