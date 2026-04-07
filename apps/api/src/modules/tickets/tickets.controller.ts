import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateTicketDto } from './create-ticket.dto';
import { TicketsService } from './tickets.service';
import { UpdateTicketDto } from './update-ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Req() req: Request, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto, req.headers);
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.ticketsService.findAll(
      {
        page,
        pageSize,
        search,
        status,
        assignedUserId,
        companyId,
      },
      req.headers,
    );
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.ticketsService.findOne(id, req.headers);
  }

  @Post(':id/reply')
  reply(@Req() req: Request, @Param('id') id: string, @Body('message') message?: string) {
    return this.ticketsService.reply(id, message, req.headers);
  }

  @Patch(':id/status')
  updateStatus(@Req() req: Request, @Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.updateStatus(id, updateTicketDto, req.headers);
  }
}
