import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('unlinked')
  getUnlinked() {
    return this.contactsService.getUnlinkedContacts();
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
