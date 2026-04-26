import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
})
export class DocumentosModule {}
