export type TicketSlaMeta = {
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  dueAt: Date;
  breached: boolean;
  warning: boolean;
  minutesToBreach: number;
};

const DEFAULT_FIRST_RESPONSE_MINUTES = Number(process.env.ZAMMAD_SLA_FIRST_RESPONSE_MINUTES ?? 120);
const DEFAULT_WARNING_MINUTES = Number(process.env.ZAMMAD_SLA_WARNING_MINUTES ?? 15);

function getPriorityMultiplier(priorityId?: number | null): number {
  if (priorityId === 3) return 0.5;
  if (priorityId === 1) return 2;
  return 1;
}

export function computeTicketSla(input: {
  createdAt: Date;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  priorityId?: number | null;
  now?: Date;
}): TicketSlaMeta {
  const now = input.now ?? new Date();
  const firstResponseAt = input.firstResponseAt ?? null;
  const resolvedAt = input.resolvedAt ?? null;

  const slaMinutes = Math.max(5, Math.floor(DEFAULT_FIRST_RESPONSE_MINUTES * getPriorityMultiplier(input.priorityId)));
  const dueAt = new Date(input.createdAt.getTime() + slaMinutes * 60 * 1000);
  const warningAt = new Date(dueAt.getTime() - DEFAULT_WARNING_MINUTES * 60 * 1000);

  const reference = firstResponseAt ?? resolvedAt ?? now;
  const breached = reference.getTime() > dueAt.getTime();
  const warning = !firstResponseAt && !resolvedAt && now.getTime() >= warningAt.getTime() && !breached;
  const minutesToBreach = Math.floor((dueAt.getTime() - now.getTime()) / 60000);

  return {
    firstResponseAt,
    resolvedAt,
    dueAt,
    breached,
    warning,
    minutesToBreach,
  };
}

