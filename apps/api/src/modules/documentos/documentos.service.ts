import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import type { IncomingHttpHeaders } from 'node:http';
import { documentoSchema, type DocumentoFormValues } from '@dosc-syspro/contracts/documento';

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAll(rawHeaders?: IncomingHttpHeaders) {
    await this.authorizationService.assertPermission(rawHeaders, 'tools:all');

    const docs = await this.prisma.documentoConfig.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return { success: true, data: docs };
  }

  async save(input: DocumentoFormValues, rawHeaders?: IncomingHttpHeaders) {
    await this.authorizationService.assertPermission(rawHeaders, 'tools:all');
    const parsed = documentoSchema.parse(input);

    const {
      id,
      emitente,
      maximoItens,
      atualizaComercial,
      processamentoEtapa,
      ...payload
    } = parsed;

    void emitente;
    void maximoItens;
    void atualizaComercial;
    void processamentoEtapa;

    if (id && id.length > 10) {
      await this.prisma.documentoConfig.update({
        where: { id },
        data: {
          ...payload,
          comportamentos: payload.comportamentos || [],
        },
      });
    } else {
      await this.prisma.documentoConfig.create({
        data: {
          ...payload,
          comportamentos: payload.comportamentos || [],
        },
      });
    }

    return { success: true };
  }

  async remove(id: string, rawHeaders?: IncomingHttpHeaders) {
    await this.authorizationService.assertPermission(rawHeaders, 'tools:all');
    await this.prisma.documentoConfig.delete({ where: { id } });
    return { success: true };
  }
}
