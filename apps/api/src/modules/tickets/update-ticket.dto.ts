import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketDto } from './create-ticket.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @IsOptional()
  @IsString()
  status?: string; // Posteriormente podemos tipar isso para um Enum (OPEN, PENDING, RESOLVED, CLOSED)

  // Outros campos específicos para atualização, como 'queue' ou 'assigneeId'
}
