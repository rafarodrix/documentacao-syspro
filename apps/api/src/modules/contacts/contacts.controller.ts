import { Controller, Get, Post, Delete, Body, Param, Patch, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(
    @Body() body: {
      name: string;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      notes?: string | null;
      companyId?: string | null;
    },
  ) {
    return this.contactsService.createContact(body);
  }

  @Get()
  list(
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
    });
  }

  @Get('unlinked')
  getUnlinked() {
    return this.contactsService.getUnlinkedContacts();
  }

  @Get(':id')
  getById(@Param('id') contactId: string) {
    return this.contactsService.getContactById(contactId);
  }

  @Patch(':id')
  updateContact(
    @Param('id') contactId: string,
    @Body() body: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      notes?: string | null;
      companyId?: string | null;
    },
  ) {
    return this.contactsService.updateContact(contactId, body);
  }

  @Post(':id/link')
  linkContact(
    @Param('id') contactId: string,
    @Body('companyId') companyId: string,
  ) {
    return this.contactsService.linkContactToCompany(contactId, companyId);
  }

  @Delete(':id')
  deleteContact(@Param('id') contactId: string) {
    return this.contactsService.deleteContact(contactId);
  }

  @Post('sync')
  sync(@Body('instanceName') instanceName?: string) {
    return this.contactsService.syncFromIntegration(instanceName);
  }
}
