import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import type { Request } from 'express';
import type { CreateUserInput, UpdateUserInput } from '@dosc-syspro/contracts/user';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Req() req: Request, @Query('search') search?: string, @Query('role') role?: string) {
    return this.usersService.findAll({ search, role }, req.headers);
  }

  @Get('check-email')
  checkEmail(@Req() req: Request, @Query('email') email?: string) {
    return this.usersService.checkEmailAvailability(email ?? '', req.headers);
  }

  @Post()
  create(
    @Req() req: Request,
    @Body() body: CreateUserInput,
  ) {
    return this.usersService.create(body, req.headers);
  }

  @Get('me/chatwoot/sso')
  getChatwootSsoLink(@Req() req: Request) {
    return this.usersService.getChatwootSsoLinkForCurrentUser(req.headers);
  }

  @Get('me/profile')
  getCurrentProfile(@Req() req: Request) {
    return this.usersService.getCurrentProfile(req.headers);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.findOne(id, req.headers);
  }

  @Put(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateUserInput,
  ) {
    return this.usersService.update(id, body, req.headers);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.remove(id, req.headers);
  }

}
