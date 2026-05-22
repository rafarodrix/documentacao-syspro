import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';

export function resolveCategoryLabel(settings: TicketModuleSettings, category?: string | null): string | null {
  const normalized = category?.trim();
  if (!normalized) return null;
  return settings.categories.find((item) => item.value === normalized)?.label ?? normalized;
}

export function formatPriorityLabel(settings: TicketModuleSettings, priority?: string | null): string {
  if (!priority) return 'Nao definida';

  const configured = settings.priorities.find((item) => {
    const value = `${item.id} ${item.value} ${item.label}`.toLowerCase();
    if (priority === 'CRITICAL') {
      return value.includes('critical') || value.includes('urgent') || value.includes('alta') || value.includes('high') || item.id === '3';
    }
    if (priority === 'HIGH') return value.includes('high') || value.includes('alta') || item.id === '3';
    if (priority === 'LOW') return value.includes('low') || value.includes('baixa') || item.id === '1';
    return value.includes('normal') || item.id === '2';
  });

  return configured?.label ?? priority;
}
