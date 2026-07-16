import {
  Controller,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { NfeParserService } from './nfe-parser.service';

@Controller('tax')
export class NfeParserController {
  constructor(private readonly nfeParserService: NfeParserService) {}

  /**
   * Recebe upload de arquivo XML de NF-e e retorna a estrutura DANFE parseada.
   * Aceita multipart/form-data com campo "file".
   *
   * O route handler do web faz proxy transparente do multipart, então aqui
   * o body já chega como um buffer com o conteúdo completo do request.
   * Usamos a abordagem raw body para evitar dependência de @types/multer.
   */
  @Post('nfe/parse')
  async parseNfe(@Req() req: Request, @Res() res: Response) {
    try {
      // O request chega como multipart via proxy; lemos o body como buffer
      const chunks: Buffer[] = [];
      for await (const chunk of req as any) {
        chunks.push(Buffer.from(chunk));
      }
      const rawBody = Buffer.concat(chunks);
      const bodyStr = rawBody.toString('utf-8');

      // Extrair o conteúdo do arquivo XML do multipart body
      // O formato multipart tem boundary markers; precisamos extrair o arquivo XML
      const xmlContent = this.extractXmlFromMultipart(bodyStr, req.headers['content-type']);

      if (!xmlContent) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      }

      const danfeData = this.nfeParserService.parseNfeXml(xmlContent);
      return res.json(danfeData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao processar XML da NF-e:', error);

      const isParseError = message.includes('nao reconhecida');
      return res
        .status(isParseError ? 400 : 500)
        .json({
          error: isParseError ? message : 'Falha ao processar o arquivo XML.',
          ...(isParseError ? {} : { details: message }),
        });
    }
  }

  private extractXmlFromMultipart(body: string, contentType?: string): string | null {
    if (!contentType?.includes('multipart/form-data')) {
      // Se não for multipart, trata como XML direto
      return body.trim() || null;
    }

    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) return body.trim() || null;

    const boundary = boundaryMatch[1];
    const parts = body.split(`--${boundary}`);

    for (const part of parts) {
      // Procura a parte que contém o campo "file"
      if (part.includes('name="file"')) {
        // O conteúdo do arquivo vem após os headers da parte (duplo \r\n)
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const content = part.slice(headerEnd + 4);
        // Remove trailing boundary markers
        const cleaned = content.replace(/\r\n--.*$/, '').trim();
        return cleaned || null;
      }
    }

    return null;
  }
}

