import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ticketModuleCreateRequestSchema,
  ticketModuleListQuerySchema,
  ticketModuleReplyRequestSchema,
  ticketModuleTriageRequestSchema,
  ticketModuleUpdateRequestSchema,
} from '@dosc-syspro/contracts/ticket';
import type { Request } from 'express';
import type { ZodType } from 'zod';
import { CreateTicketDto } from './create-ticket.dto';
import { TicketsService } from './tickets.service';
import { UpdateTicketDto } from './update-ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  private parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return parsed.data;
  }

  @Post()
  create(@Req() req: Request, @Body() createTicketDto: CreateTicketDto) {
    const input = this.parseOrThrow(ticketModuleCreateRequestSchema, createTicketDto);
    return this.ticketsService.create(input, req.headers);
  }

  @Get('linked-companies')
  getLinkedCompanies(@Req() req: Request) {
    return this.ticketsService.getLinkedCompanies(req.headers);
  }

  @Get('customer-emails')
  findCustomerOptions(@Req() req: Request, @Query('q') q?: string, @Query('limit') limit?: string) {
    return this.ticketsService.findCustomerOptions({ q, limit }, req.headers);
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('statusGroup') statusGroup?: string,
    @Query('queue') queue?: string,
    @Query('team') team?: string,
    @Query('closedWindow') closedWindow?: string,
    @Query('category') category?: string,
    @Query('module') module?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('companyId') companyId?: string,
  ) {
    const input = this.parseOrThrow(ticketModuleListQuerySchema, {
      page,
      pageSize,
      search,
      status,
      statusGroup,
      queue,
      team,
      closedWindow,
      category,
      module,
      assignedUserId,
      companyId,
    });

    return this.ticketsService.findAll(
      input,
      req.headers,
    );
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.ticketsService.findOne(id, { page, pageSize }, req.headers);
  }

  @Post(':id/reply')
  reply(@Req() req: Request, @Param('id') id: string, @Body() body: { message?: string; visibility?: 'PUBLIC' | 'INTERNAL' }) {
    const input = this.parseOrThrow(ticketModuleReplyRequestSchema, body);
    return this.ticketsService.reply(id, input.message, input.visibility, req.headers);
  }

  @Patch(':id/status')
  updateStatus(@Req() req: Request, @Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    const input = this.parseOrThrow(ticketModuleUpdateRequestSchema, updateTicketDto);
    return this.ticketsService.updateStatus(id, input, req.headers);
  }

  @Post(':id/assign-me')
  assignToMe(@Req() req: Request, @Param('id') id: string) {
    return this.ticketsService.assignToMe(id, req.headers);
  }

  @Patch(':id/triage')
  triageTicket(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const input = this.parseOrThrow(ticketModuleTriageRequestSchema, body);
    return this.ticketsService.triageTicket(id, input, req.headers);
  }
}
