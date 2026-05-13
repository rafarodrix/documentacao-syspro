import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import {
  TICKET_REPLY_MAX_ATTACHMENTS,
  TICKET_REPLY_MULTIPART_FIELD_NAMES,
  ticketModuleCreateRequestSchema,
  ticketModuleListQuerySchema,
  ticketModuleReplyMultipartBodySchema,
  ticketModuleTriageRequestSchema,
  ticketModuleUpdateRequestSchema,
} from '@dosc-syspro/contracts/ticket';
import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateTicketDto } from './create-ticket.dto';
import { TicketsService } from './tickets.service';
import { UpdateTicketDto } from './update-ticket.dto';

type UploadedTicketReplyFile = {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
};

type NormalizedTicketReplyFile = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

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
  @UseInterceptors(FilesInterceptor(TICKET_REPLY_MULTIPART_FIELD_NAMES.attachments, TICKET_REPLY_MAX_ATTACHMENTS))
  reply(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
    @UploadedFiles() files: UploadedTicketReplyFile[] = [],
  ) {
    const parsedBody = this.parseOrThrow(ticketModuleReplyMultipartBodySchema, body);
    const normalizedFiles: NormalizedTicketReplyFile[] = Array.isArray(files)
      ? files.flatMap((file) => {
          if (!file?.buffer?.length) {
            return [];
          }

          return [{
            filename: file.originalname || 'arquivo',
            mimeType: file.mimetype || 'application/octet-stream',
            buffer: file.buffer,
          }];
        })
      : [];

    const input = {
      ...parsedBody,
      attachments: normalizedFiles,
    };

    return this.ticketsService.reply(id, input, req.headers);
  }

  @Get(':id/attachments/:attachmentId')
  downloadAttachment(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.ticketsService.downloadAttachment(id, attachmentId, req.headers, res);
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
