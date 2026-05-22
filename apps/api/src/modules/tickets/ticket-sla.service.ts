import { Injectable } from '@nestjs/common';
import { ConversationPriority as TicketPriority } from '@prisma/client';
import { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';
import { resolveTicketSlaPolicy } from '@dosc-syspro/tickets-domain';

@Injectable()
export class TicketSlaService {
  calculateSlaDates(
    priority: TicketPriority,
    settings: TicketModuleSettings,
    now: Date = new Date(),
  ): { 
    slaResponseDueAt: Date; 
    slaResolutionDueAt: Date;
    slaPolicyName: string;
    slaFirstResponseMinutes: number;
    slaResolutionMinutes: number;
  } {
    const slaPolicy = resolveTicketSlaPolicy(priority, settings);
    return {
      slaResponseDueAt: new Date(now.getTime() + slaPolicy.firstResponseMinutes * 60000),
      slaResolutionDueAt: new Date(now.getTime() + slaPolicy.resolutionMinutes * 60000),
      slaPolicyName: slaPolicy.name,
      slaFirstResponseMinutes: slaPolicy.firstResponseMinutes,
      slaResolutionMinutes: slaPolicy.resolutionMinutes,
    };
  }
}
