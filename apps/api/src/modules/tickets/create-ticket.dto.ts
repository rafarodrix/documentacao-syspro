import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum TicketPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
