import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DocsController],
  providers: [DocsService],
})
export class DocsModule {}
