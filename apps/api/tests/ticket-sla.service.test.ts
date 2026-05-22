import { describe, expect, it } from 'vitest';
import { ConversationPriority as TicketPriority } from '@prisma/client';
import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';
import { TicketSlaService } from '../src/modules/tickets/ticket-sla.service';

describe('TicketSlaService', () => {
  const service = new TicketSlaService();

  const mockSettings = {
    categories: [],
    teams: [],
    modules: [],
    autoAssignToCreator: false,
    autoResponseEnabled: false,
    autoResponseMessage: '',
    requireTestingReturnReason: true,
    defaultPriority: '2 normal',
    defaultTeam: 'SUPORTE',
    priorities: [
      { id: '1', value: '1 low', label: 'Baixa', firstResponseMinutes: 240, resolutionMinutes: 1440, slaHours: 24 },
      { id: '2', value: '2 normal', label: 'Normal SLA', firstResponseMinutes: 120, resolutionMinutes: 480, slaHours: 8 },
      { id: '4', value: '4 critical', label: 'Critico SLA', firstResponseMinutes: 15, resolutionMinutes: 60, slaHours: 1 },
      { id: '3', value: '3 high', label: 'Alta SLA', firstResponseMinutes: 60, resolutionMinutes: 240, slaHours: 4 },
    ],
  } as unknown as TicketModuleSettings;

  it('should calculate SLA dates and return policy metadata correctly for normal priority', () => {
    const now = new Date('2026-05-22T12:00:00.000Z');
    const result = service.calculateSlaDates(TicketPriority.NORMAL, mockSettings, now);

    expect(result.slaPolicyName).toBe('Normal SLA');
    expect(result.slaFirstResponseMinutes).toBe(120);
    expect(result.slaResolutionMinutes).toBe(480);
    expect(result.slaResponseDueAt.toISOString()).toBe('2026-05-22T14:00:00.000Z'); // now + 120 min
    expect(result.slaResolutionDueAt.toISOString()).toBe('2026-05-22T20:00:00.000Z'); // now + 480 min
  });

  it('should calculate SLA dates for critical priority correctly', () => {
    const now = new Date('2026-05-22T12:00:00.000Z');
    const result = service.calculateSlaDates(TicketPriority.CRITICAL, mockSettings, now);

    expect(result.slaPolicyName).toBe('Critico SLA');
    expect(result.slaFirstResponseMinutes).toBe(15);
    expect(result.slaResolutionMinutes).toBe(60);
    expect(result.slaResponseDueAt.toISOString()).toBe('2026-05-22T12:15:00.000Z'); // now + 15 min
    expect(result.slaResolutionDueAt.toISOString()).toBe('2026-05-22T13:00:00.000Z'); // now + 60 min
  });
});
