import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CompanyContactSource, CompanyContactStatus, CompanySegment, CompanyStatus } from '@prisma/client';
import type { CreateCompanyInput, CreateCompanyOutput } from '@dosc-syspro/contracts/company';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  list(@Req() req: Request, @Query('search') search?: string, @Query('status') status?: string) {
    return this.companiesService.listCompanies({ search, status }, req.headers);
  }

  @Get('view/admin')
  getAdminView(@Req() req: Request) {
    return this.companiesService.getAdminView(req.headers);
  }

  @Get('lookup-cnpj')
  lookupCompanyProfileByCnpj(@Req() req: Request, @Query('cnpj') cnpj?: string) {
    return this.companiesService.lookupCompanyProfileByCnpj(cnpj ?? '', req.headers);
  }

  @Get('options')
  getOptions(@Req() req: Request) {
    return this.companiesService.getCompanyOptions(req.headers);
  }

  @Post('access/segments')
  checkSegmentAccess(
    @Req() req: Request,
    @Body('requiredSegments') requiredSegments: CompanySegment[] = [],
  ) {
    return this.companiesService.canAccessByCompanySegment(requiredSegments, req.headers);
  }

  @Get(':id/ticket-emails')
  getTicketEmails(@Req() req: Request, @Param('id') id: string) {
    return this.companiesService.getCompanyTicketEmails(id, req.headers);
  }

  @Get(':id/edit-view')
  getEditView(@Req() req: Request, @Param('id') id: string) {
    return this.companiesService.getCompanyEditView(id, req.headers);
  }

  @Post()
  create(
    @Req() req: Request,
    @Body()
    body: {
      data: CreateCompanyInput | CreateCompanyOutput;
      ticketEmails?: Array<{ email: string; label?: string; isActive?: boolean }>;
      contacts?: Array<{
        name: string;
        email?: string;
        phone?: string;
        whatsapp?: string;
        notes?: string;
        isPrimary?: boolean;
        source?: CompanyContactSource;
        status?: CompanyContactStatus;
      }>;
    },
  ) {
    return this.companiesService.createCompany(body, req.headers);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      data: CreateCompanyInput | CreateCompanyOutput;
      ticketEmails?: Array<{ email: string; label?: string; isActive?: boolean }>;
      contacts?: Array<{
        name: string;
        email?: string;
        phone?: string;
        whatsapp?: string;
        notes?: string;
        isPrimary?: boolean;
        source?: CompanyContactSource;
        status?: CompanyContactStatus;
      }>;
    },
  ) {
    return this.companiesService.updateCompany(id, body, req.headers);
  }

  @Patch(':id/status')
  updateStatus(@Req() req: Request, @Param('id') id: string, @Body('status') status: CompanyStatus) {
    return this.companiesService.updateCompanyStatus(id, status, req.headers);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.companiesService.deleteCompany(id, req.headers);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchCompanies(@Req() req: Request, @Query('q') query: string | undefined) {
    return this.companiesService.searchCompanies(query, req.headers);
  }
}
