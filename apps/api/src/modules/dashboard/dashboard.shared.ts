import type { DashboardOpenTicketRecord, DashboardTicketKpis, DashboardTicketSummary } from '@dosc-syspro/contracts/dashboard';
import type { TicketModuleRecord } from '@dosc-syspro/contracts/ticket';

export const DASHBOARD_TICKETS_TIMEOUT_MS = 4000;

function timeoutError(label: string, timeoutMs: number) {
  return new Error(`${label} excedeu ${timeoutMs}ms.`);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(label, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function getDashboardTimeoutWarning() {
  return 'Modulo de tickets em contingencia no dashboard. Alguns cards foram carregados com dados reduzidos.';
}

export function getLast7DaysRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return { start, days };
}

export function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toSeries(events: Date[]) {
  const { days } = getLast7DaysRange();
  const map = new Map<string, number>();

  for (const day of days) {
    const key = day.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  for (const event of events) {
    const key = new Date(event).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }

  return days.map((day) => {
    const key = day.toISOString().slice(0, 10);
    return {
      label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: map.get(key) || 0,
    };
  });
}

export function toTicketSummaryItems(records: TicketModuleRecord[]): DashboardTicketSummary[] {
  return records.map((ticket) => ({
    id: ticket.id,
    number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
    subject: ticket.subject || 'Sem assunto',
    status: ticket.status,
    priority: ticket.priority,
    lastUpdate: ticket.updatedAt,
  }));
}

export function readTicketMetadataString(metadata: TicketModuleRecord['metadata'], key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function toOpenTicketRecordItems(records: TicketModuleRecord[]): DashboardOpenTicketRecord[] {
  const items: DashboardOpenTicketRecord[] = [];

  for (const ticket of records) {
    if (ticket.status === 'RESOLVED' || ticket.status === 'ARCHIVED') continue;

    const currentTeam = readTicketMetadataString(ticket.metadata, 'currentTeam');
    const moduleName = readTicketMetadataString(ticket.metadata, 'module');
    const categoryName = readTicketMetadataString(ticket.metadata, 'category');

    items.push({
      id: ticket.id,
      number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
      subject: ticket.subject || 'Sem assunto',
      team:
        currentTeam === 'SUPORTE' || currentTeam === 'DESENVOLVIMENTO'
          ? currentTeam
          : null,
      module: moduleName,
      category: categoryName,
      priority: ticket.priority,
      status: ticket.status,
    });
  }

  return items;
}

export function buildTicketKpis(records: DashboardTicketSummary[]): DashboardTicketKpis {
  const resolved = records.filter(
    (ticket) => ticket.status === 'RESOLVED' || ticket.status === 'ARCHIVED',
  ).length;
  const pending = records.filter(
    (ticket) =>
      ticket.status === 'IN_PROGRESS' ||
      ticket.status === 'TESTING' ||
      ticket.status === 'WAITING_CUSTOMER' ||
      ticket.status === 'WAITING_INTERNAL',
  ).length;
  const open = records.filter(
    (ticket) =>
      ticket.status === 'NEW' ||
      ticket.status === 'UNASSIGNED' ||
      ticket.status === 'TRIAGE',
  ).length;

  return { open, pending, resolved };
}

export function mapConversationStatus(status: string) {
  switch (status) {
    case 'UNASSIGNED':
      return 'Sem responsavel';
    case 'TRIAGE':
      return 'Triagem';
    case 'IN_PROGRESS':
      return 'Em andamento';
    case 'WAITING_CUSTOMER':
      return 'Aguardando cliente';
    case 'WAITING_INTERNAL':
      return 'Aguardando interno';
    case 'TESTING':
      return 'Teste';
    case 'RESOLVED':
      return 'Resolvido';
    case 'ARCHIVED':
      return 'Arquivado';
    default:
      return 'Novo';
  }
}

export function averageDurationInMinutes(items: Array<{ startedAt: Date; endedAt: Date | null | undefined }>) {
  const valid = items.filter((item) => item.endedAt instanceof Date && item.endedAt >= item.startedAt);
  if (!valid.length) return null;

  const totalMs = valid.reduce((sum, item) => sum + (item.endedAt!.getTime() - item.startedAt.getTime()), 0);
  return Math.round((totalMs / valid.length / 60000) * 10) / 10;
}

export function parseDateInput(value?: string, endOfDay = false) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const base = new Date(`${normalized}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(base.getTime()) ? null : base;
}

export function parseChatwootDate(value: unknown) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    const parsed = new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function extractChatwootConversationLabels(conversation: any): string[] {
  const labels = Array.isArray(conversation?.labels) ? conversation.labels : [];
  return labels.map((item: unknown) => String(item ?? '').trim().toLowerCase()).filter(Boolean);
}

export function extractChatwootConversationCustomAttributes(conversation: any): Record<string, unknown> {
  const value =
    conversation?.custom_attributes ??
    conversation?.meta?.custom_attributes ??
    conversation?.additional_attributes ??
    conversation?.meta?.additional_attributes;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function extractChatwootAssignee(conversation: any) {
  const assignee = conversation?.meta?.assignee ?? conversation?.assignee ?? conversation?.last_non_activity_message?.conversation?.assignee;
  const id = String(assignee?.id ?? '').trim();
  const name = String(assignee?.name ?? assignee?.available_name ?? assignee?.email ?? '').trim();
  return id ? { id, name: name || id } : null;
}

export function calculateMedian(values: number[]): number | null {
  if (!values || values.length === 0) return null;
  const sorted = [...values].filter((v) => typeof v === 'number' && !Number.isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }
  return Math.round(sorted[mid] * 10) / 10;
}

export function extractChatwootChannel(conversation: any) {
  const channelRaw = String(
    conversation?.meta?.channel ??
    conversation?.channel ??
    conversation?.inbox?.channel_type ??
    '',
  ).trim().toLowerCase();

  const inboxName = String(
    conversation?.inbox?.name ??
    conversation?.meta?.inbox?.name ??
    '',
  ).trim().toLowerCase();

  if (channelRaw.includes('email') || inboxName.includes('email')) return 'EMAIL' as const;
  if (channelRaw.includes('phone') || channelRaw.includes('call') || inboxName.includes('telef') || inboxName.includes('phone')) return 'PHONE' as const;
  if (channelRaw.includes('whatsapp') || channelRaw.includes('wa') || inboxName.includes('whatsapp') || inboxName.includes('wa')) return 'WHATSAPP' as const;
  if (channelRaw.includes('portal') || channelRaw.includes('web_widget') || channelRaw.includes('webwidget') || inboxName.includes('portal') || inboxName.includes('widget')) return 'PORTAL' as const;

  // Default to WHATSAPP if channel is from Chatwoot API integration without explicit web_widget label
  return 'WHATSAPP' as const;
}

export function extractChatwootContactSummary(conversation: any) {
  const name = String(
    conversation?.meta?.sender?.name ??
    conversation?.contact?.name ??
    conversation?.last_non_activity_message?.sender?.name ??
    '',
  ).trim();
  const phone = String(
    conversation?.meta?.sender?.phone_number ??
    conversation?.contact?.phone_number ??
    conversation?.last_non_activity_message?.sender?.phone_number ??
    '',
  ).trim();
  const identifier = String(
    conversation?.meta?.sender?.identifier ??
    conversation?.contact?.identifier ??
    conversation?.last_non_activity_message?.sender?.identifier ??
    conversation?.contact_inbox?.source_id ??
    '',
  ).trim();
  const key = identifier || phone || name;
  const label = name || phone || identifier || 'Contato nao identificado';
  return key ? { key, name: label } : null;
}

export function extractChatwootContactText(conversation: any) {
  const candidates = [
    conversation?.meta?.sender?.name,
    conversation?.meta?.sender?.phone_number,
    conversation?.meta?.sender?.identifier,
    conversation?.last_non_activity_message?.sender?.name,
    conversation?.last_non_activity_message?.sender?.phone_number,
    conversation?.contact?.name,
    conversation?.contact?.phone_number,
  ];
  return candidates.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ').toLowerCase();
}

export function resolveChatwootClosureOrigin(conversation: any) {
  const customAttributes = extractChatwootConversationCustomAttributes(conversation);
  const closureOrigin = String(customAttributes.closure_origin ?? '').trim().toLowerCase();
  if (closureOrigin) return closureOrigin;

  const labels = extractChatwootConversationLabels(conversation);
  if (labels.includes('cancelado_cliente')) return 'cancelled_by_customer';
  if (labels.includes('cancelado_agente')) return 'cancelled_by_agent';
  if (labels.includes('spam')) return 'spam';
  return null;
}

export function shouldSkipChatwootCsat(conversation: any) {
  const customAttributes = extractChatwootConversationCustomAttributes(conversation);
  const skipCsatRaw = String(customAttributes.skip_csat ?? '').trim().toLowerCase();
  return skipCsatRaw === 'true' || skipCsatRaw === '1' || Boolean(resolveChatwootClosureOrigin(conversation));
}
