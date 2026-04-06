import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchCompanies(@Query('q') query: string | undefined) {
    const q = query?.trim() ?? '';
    if (!q) {
      return [];
    }

    try {
      const data = await this.prisma.company.findMany({
        where: {
          OR: [
            { razaoSocial: { contains: q, mode: 'insensitive' } },
            { nomeFantasia: { contains: q, mode: 'insensitive' } },
            { cnpj: { contains: q } },
          ],
        },
        take: 10,
        select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true },
      });
      return data;
    } catch (error) {
      return [];
    }
  }
}