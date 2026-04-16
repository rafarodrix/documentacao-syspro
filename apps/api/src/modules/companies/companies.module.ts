import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompaniesService } from './companies.service';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [PrismaModule, ContactsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
