import { Module, forwardRef } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompaniesService } from './companies.service';
import { CompaniesRouter } from './companies.router';
import { ContactsModule } from '../contacts/contacts.module';
import { TrpcModule } from '../trpc/trpc.module';

@Module({
  imports: [PrismaModule, ContactsModule, forwardRef(() => TrpcModule)],
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesRouter],
  exports: [CompaniesRouter],
})
export class CompaniesModule {}
