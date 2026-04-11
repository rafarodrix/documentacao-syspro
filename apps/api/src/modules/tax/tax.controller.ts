import { Body, Controller, Delete, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizationService } from '../authorization/authorization.service';
import { TaxService } from './tax.service';

@Controller('tax')
export class TaxController {
  constructor(
    private readonly taxService: TaxService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Get('classifications')
  async getClassifications(@Req() req: Request) {
    await this.authorizationService.getRequester(req.headers);
    return this.taxService.getClassificationListViewData();
  }

  @Get('rules')
  async getRules(@Req() req: Request) {
    await this.authorizationService.getRequester(req.headers);
    return this.taxService.getRulesViewData();
  }

  @Get('anexos')
  async getAnexos(@Req() req: Request) {
    await this.authorizationService.getRequester(req.headers);
    return this.taxService.getAnexosViewData();
  }

  @Get('cred-presumido')
  async getCredPresumido(@Req() req: Request) {
    await this.authorizationService.getRequester(req.headers);
    return this.taxService.getCredPresumidoViewData();
  }

  @Get('ncm')
  async getNcm(@Req() req: Request) {
    await this.authorizationService.getRequester(req.headers);
    return this.taxService.getNcmViewData();
  }

  @Get('ncm-lookup')
  async lookupNcm(@Req() req: Request, @Res() res: Response, @Query('ncm') ncm: string | null) {
    await this.authorizationService.getRequester(req.headers);
    const result = await this.taxService.lookupNcm(ncm);
    if ('error' in result) {
      return res.status(400).json(result);
    }
    return res.json(result);
  }

  @Get('sync-jobs')
  async getSyncJobs(@Req() req: Request, @Query('mode') mode?: string | null) {
    await this.authorizationService.assertPermission(req.headers, 'tax_reform:manage');
    const jobs = await this.taxService.listSyncJobs(mode);
    return { success: true, jobs };
  }

  @Delete('sync-jobs')
  async clearSyncJobs(@Req() req: Request, @Query('mode') mode?: string | null) {
    await this.authorizationService.assertPermission(req.headers, 'tax_reform:manage');
    const result = await this.taxService.clearSyncJobs(mode);
    return { success: true, ...result };
  }

  @Post('sync-chunk')
  async postSyncChunk(@Req() req: Request, @Res() res: Response, @Body() body: unknown) {
    await this.authorizationService.assertPermission(req.headers, 'tax_reform:manage');
    const result = await this.taxService.processSyncChunk((body ?? {}) as Record<string, unknown>);
    return res.status(result.statusCode).json(result.body);
  }
}
