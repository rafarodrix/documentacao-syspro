import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Req() req: Request, @Query('search') search?: string, @Query('role') role?: string) {
    return this.usersService.findAll({ search, role }, req.headers);
  }

  @Get('view/client-admin')
  getClientAdminView(@Req() req: Request) {
    return this.usersService.getClientAdminView(req.headers);
  }

  @Get('view/system-admin')
  getSystemAdminView(@Req() req: Request) {
    return this.usersService.getSystemAdminView(req.headers);
  }

  @Get('view/client/:id/edit')
  getClientUserEditView(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.getClientUserEditView(id, req.headers);
  }

  @Get('view/system/:id/edit')
  getSystemUserEditView(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.getSystemUserEditView(id, req.headers);
  }

  @Post()
  create(
    @Req() req: Request,
    @Body() body: { email: string; name: string; password?: string; role?: Role; contactId?: string },
  ) {
    return this.usersService.create(body, req.headers);
  }

  @Get('me/chatwoot/sso')
  getChatwootSsoLink(@Req() req: Request) {
    return this.usersService.getChatwootSsoLinkForCurrentUser(req.headers);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.findOne(id, req.headers);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; role?: Role; contactId?: string | null; isActive?: boolean },
  ) {
    return this.usersService.update(id, body, req.headers);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.remove(id, req.headers);
  }

}
