import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompaniesController],
})
export class CompaniesModule {}