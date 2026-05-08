import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompaniesService } from './companies.service';
import { CompaniesRouter } from './companies.router';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [PrismaModule, ContactsModule],
  providers: [CompaniesService, CompaniesRouter],
  exports: [CompaniesService, CompaniesRouter],
})
export class CompaniesModule {}
