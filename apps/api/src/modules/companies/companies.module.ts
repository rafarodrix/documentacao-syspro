import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompaniesService } from './companies.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
