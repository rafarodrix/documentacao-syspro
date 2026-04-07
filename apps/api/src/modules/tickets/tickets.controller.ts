import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

// Assumindo que você tem um AuthGuard configurado no Nest
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('tickets')
// @UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto, @Req() req: any) {
    const userId = req.user?.id || 'system'; // Ajustar conforme a sua estratégia de Autenticação no Nest
    return this.ticketsService.create(userId, createTicketDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  // Talvez a deleção seja restrita a administradores apenas, ou substituída por soft-delete (arquivamento).
}
