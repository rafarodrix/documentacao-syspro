import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { DocumentoFormValues } from '@dosc-syspro/contracts/documento';
import { DocumentosService } from './documentos.service';

@Controller('documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.documentosService.findAll(req.headers);
  }

  @Post()
  save(@Req() req: Request, @Body() body: DocumentoFormValues) {
    return this.documentosService.save(body, req.headers);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.documentosService.remove(id, req.headers);
  }
}
