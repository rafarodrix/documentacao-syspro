import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CompaniesService } from './companies.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
