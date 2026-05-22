import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';

const FALLBACK_SLA: Record<string, { firstResponseMinutes: number; resolutionMinutes: number }> = {
  LOW: { firstResponseMinutes: 240, resolutionMinutes: 4320 },
  NORMAL: { firstResponseMinutes: 60, resolutionMinutes: 1440 },
  HIGH: { firstResponseMinutes: 15, resolutionMinutes: 240 },
  CRITICAL: { firstResponseMinutes: 15, resolutionMinutes: 240 },
};

export function resolveTicketSlaPolicy(
  priority: string,
  settings: TicketModuleSettings,
): { name: string; firstResponseMinutes: number; resolutionMinutes: number } {
  const configured = settings.priorities.find((item) => {
    const value = `${item.id} ${item.value} ${item.label}`.toLowerCase();
    if (priority === 'CRITICAL') {
      return value.includes('critical') || value.includes('urgent') || value.includes('alta') || value.includes('high') || item.id === '3';
    }
    if (priority === 'HIGH') return value.includes('high') || value.includes('alta') || item.id === '3';
    if (priority === 'LOW') return value.includes('low') || value.includes('baixa') || item.id === '1';
    return value.includes('normal') || item.id === '2';
  });

  const fallback = FALLBACK_SLA[priority] ?? FALLBACK_SLA.NORMAL;

  return {
    name: configured?.label ?? priority,
    firstResponseMinutes: configured?.firstResponseMinutes ?? fallback.firstResponseMinutes,
    resolutionMinutes: configured?.resolutionMinutes ?? (configured?.slaHours ? configured.slaHours * 60 : fallback.resolutionMinutes),
  };
}
