import { Controller, Get, Post, Delete, Body, Param, Patch, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(
    @Req() req: Request,
    @Body() body: {
      name: string;
      email?: string | null;
      phone?: string | null;
      cpf?: string | null;
      jobTitle?: string | null;
      whatsapp?: string | null;
      notes?: string | null;
      companyId?: string | null;
      companyIds?: string[] | null;
    },
  ) {
    return this.contactsService.createContact(body, req.headers);
  }

  @Get()
  list(
    @Req() req: Request,
    @Query('q') query?: string,
    @Query('unlinked') unlinked?: string,
    @Query('companyId') companyId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contactsService.getContacts({
      q: query,
      unlinked,
      companyId,
      limit,
    }, req.headers);
  }

  @Get('unlinked')
  getUnlinked(@Req() req: Request) {
    return this.contactsService.getUnlinkedContacts(req.headers);
  }

  @Get(':id')
  getById(@Req() req: Request, @Param('id') contactId: string) {
    return this.contactsService.getContactById(contactId, req.headers);
  }

  @Patch(':id')
  updateContact(
    @Req() req: Request,
    @Param('id') contactId: string,
    @Body() body: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      cpf?: string | null;
      jobTitle?: string | null;
      whatsapp?: string | null;
      notes?: string | null;
      companyId?: string | null;
      companyIds?: string[] | null;
    },
  ) {
    return this.contactsService.updateContact(contactId, body, req.headers);
  }

  @Post(':id/link')
  linkContact(
    @Req() req: Request,
    @Param('id') contactId: string,
    @Body('companyId') companyId: string,
  ) {
    return this.contactsService.linkContactToCompany(contactId, companyId, req.headers);
  }

  @Delete(':id')
  deleteContact(@Req() req: Request, @Param('id') contactId: string) {
    return this.contactsService.deleteContact(contactId, req.headers);
  }

  @Post('sync')
  sync(@Req() req: Request, @Body('instanceName') instanceName?: string) {
    return this.contactsService.syncFromIntegration(instanceName, req.headers);
  }
}
