import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() body: { email: string; name: string; role?: Role; companyId?: string }) {
    return this.usersService.create(body);
  }
}