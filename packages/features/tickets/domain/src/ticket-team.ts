import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';

export function generateTicketNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 900 + 100);
  return `TK-${timestamp}${random}`;
}

export function resolveTicketTeam(
  requestedTeam: string | undefined,
  settings: TicketModuleSettings,
  category?: string | null,
  allowDevelopment = true,
  preferDevelopment = false,
): 'SUPORTE' | 'DESENVOLVIMENTO' {
  const normalized = requestedTeam?.trim().toUpperCase();
  if (normalized === 'SUPORTE' || normalized === 'DESENVOLVIMENTO') {
    return normalized === 'DESENVOLVIMENTO' && !allowDevelopment ? 'SUPORTE' : normalized;
  }

  const categoryDefaultTeam = settings.categories.find((item) => item.value === category)?.defaultTeam;
  if (categoryDefaultTeam === 'SUPORTE' || categoryDefaultTeam === 'DESENVOLVIMENTO') {
    return categoryDefaultTeam === 'DESENVOLVIMENTO' && !allowDevelopment ? 'SUPORTE' : categoryDefaultTeam;
  }

  if (preferDevelopment && allowDevelopment) return 'DESENVOLVIMENTO';

  return settings.defaultTeam === 'DESENVOLVIMENTO' && allowDevelopment ? 'DESENVOLVIMENTO' : 'SUPORTE';
}

export function resolveCategoryType(
  settings: TicketModuleSettings,
  category?: string | null,
  team?: string | null,
): 'SUPORTE' | 'BUG' | 'MELHORIA' | 'NOVA_FUNCIONALIDADE' | null {
  const normalized = category?.trim();
  const configuredType = settings.categories.find((item) => item.value === normalized)?.type;
  if (
    configuredType === 'SUPORTE' ||
    configuredType === 'BUG' ||
    configuredType === 'MELHORIA' ||
    configuredType === 'NOVA_FUNCIONALIDADE'
  ) {
    return configuredType;
  }
  return team === 'SUPORTE' ? 'SUPORTE' : null;
}
