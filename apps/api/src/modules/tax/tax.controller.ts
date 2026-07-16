import { Body, Controller, Delete, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizationService } from '../authorization/authorization.service';
import { TaxService } from './tax.service';
import { TaxSuggestionService } from './tax-suggestion.service';

@Controller('tax')
export class TaxController {
  constructor(
    private readonly taxService: TaxService,
    private readonly authorizationService: AuthorizationService,
    private readonly taxSuggestionService: TaxSuggestionService,
  ) {}

  @Get('classifications')
  async getClassifications(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'tools:view');
    return this.taxService.getClassificationListViewData();
  }

  @Get('rules')
  async getRules(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'tools:view');
    return this.taxService.getRulesViewData();
  }

  @Get('anexos')
  async getAnexos(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'tools:view');
    return this.taxService.getAnexosViewData();
  }

  @Get('cred-presumido')
  async getCredPresumido(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'tools:view');
    return this.taxService.getCredPresumidoViewData();
  }

  @Get('ncm')
  async getNcm(@Req() req: Request) {
    await this.authorizationService.assertPermission(req.headers, 'tools:view');
    return this.taxService.getNcmViewData();
  }

  @Get('ncm-lookup')
  async lookupNcm(@Req() req: Request, @Res() res: Response, @Query('ncm') ncm: string | null) {
    await this.authorizationService.assertPermission(req.headers, 'tools:view');
    const result = await this.taxService.lookupNcm(ncm);
    if ('error' in result) {
      return res.status(400).json(result);
    }
    return res.json(result);
  }

  @Get('sync-jobs')
  async getSyncJobs(@Req() req: Request, @Query('mode') mode?: string | null) {
    await this.authorizationService.assertPermission(req.headers, 'tools:all');
    const jobs = await this.taxService.listSyncJobs(mode);
    return { success: true, jobs };
  }

  @Delete('sync-jobs')
  async clearSyncJobs(@Req() req: Request, @Query('mode') mode?: string | null) {
    await this.authorizationService.assertPermission(req.headers, 'tools:all');
    const result = await this.taxService.clearSyncJobs(mode);
    return { success: true, ...result };
  }

  @Post('sync-chunk')
  async postSyncChunk(@Req() req: Request, @Res() res: Response, @Body() body: unknown) {
    await this.authorizationService.assertPermission(req.headers, 'tools:all');
    const result = await this.taxService.processSyncChunk((body ?? {}) as Record<string, unknown>);
    return res.status(result.statusCode).json(result.body);
  }

  /**
   * Sugestão de classificação tributária a partir de CSTs.
   * Ferramenta pública acessível sem autenticação.
   */
  @Post('suggest')
  suggestTaxClassification(
    @Body() body: { cstIcms?: string; pIcms?: string; cstPis?: string; cstCofins?: string },
    @Res() res: Response,
  ) {
    const { cstIcms, pIcms, cstPis, cstCofins } = body ?? {};

    if (!cstIcms || !cstPis || !cstCofins) {
      return res
        .status(400)
        .json({ error: 'Os campos cstIcms, cstPis e cstCofins sao obrigatorios.' });
    }

    const result = this.taxSuggestionService.suggest({ cstIcms, pIcms, cstPis, cstCofins });
    return res.json(result);
  }
}
