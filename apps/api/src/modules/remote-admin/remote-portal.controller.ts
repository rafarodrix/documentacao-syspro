import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RemoteAdminService } from './remote-admin.service';

@Controller('remote')
export class RemotePortalController {
  constructor(private readonly remoteAdminService: RemoteAdminService) {}

  @Get('sessions')
  listSessions(@Req() req: Request) {
    return this.remoteAdminService.listRemoteSessions(req.headers);
  }

  @Post('sessions')
  createSession(@Req() req: Request, @Body() body: unknown) {
    return this.remoteAdminService.createRemoteSession(body, req.headers);
  }

  @Post('sessions/cleanup')
  cleanupSessions(@Req() req: Request) {
    return this.remoteAdminService.cleanupRemoteSessions(req.headers);
  }

  @Post('sessions/:id/start')
  startSession(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.startRemoteSession(id, req.headers);
  }

  @Post('sessions/:id/stop')
  stopSession(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.stopRemoteSession(id, req.headers);
  }

  @Post('discovered-hosts/:id/link')
  linkDiscoveredHost(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.remoteAdminService.linkDiscoveredHost(id, body, req.headers);
  }

  @Get('companies/search')
  searchCompanies(@Req() req: Request, @Query('q') query?: string) {
    return this.remoteAdminService.searchRemoteCompanies(query ?? '', req.headers);
  }

  @Post('hosts')
  createHost(@Req() req: Request, @Body() body: unknown) {
    return this.remoteAdminService.createRemoteHost(body, req.headers);
  }

  @Patch('hosts/:id')
  updateHost(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.remoteAdminService.updateRemoteHost(id, body, req.headers);
  }

  @Delete('hosts/:id')
  deleteHost(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.deleteRemoteHost(id, req.headers);
  }

  @Post('hosts/:id/agent-token')
  rotateHostAgentToken(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.rotateRemoteHostAgentToken(id, req.headers);
  }

  @Delete('hosts/:id/agent-token')
  revokeHostAgentToken(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.revokeRemoteHostAgentToken(id, req.headers);
  }

  @Patch('hosts/:id/syspro-updates/:updateId')
  relinkHostSysproUpdate(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('updateId') updateId: string,
    @Body() body: unknown,
  ) {
    return this.remoteAdminService.relinkRemoteHostSysproUpdate(id, updateId, body, req.headers);
  }

  @Get('rustdesk/address-book')
  listAddressBook(@Req() req: Request) {
    return this.remoteAdminService.listRemoteAddressBook(req.headers);
  }

  @Get('rustdesk/address-book/credentials')
  listAddressBookCredentials(@Req() req: Request) {
    return this.remoteAdminService.listAddressBookCredentials(req.headers);
  }

  @Post('rustdesk/address-book/credentials')
  createAddressBookCredential(@Req() req: Request, @Body() body: unknown) {
    return this.remoteAdminService.createAddressBookCredential(body, req.headers);
  }

  @Post('rustdesk/address-book/credentials/:id/rotate')
  rotateAddressBookCredential(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.rotateAddressBookCredential(id, req.headers);
  }

  @Post('rustdesk/address-book/credentials/:id/revoke')
  revokeAddressBookCredential(@Req() req: Request, @Param('id') id: string) {
    return this.remoteAdminService.revokeAddressBookCredential(id, req.headers);
  }

}
