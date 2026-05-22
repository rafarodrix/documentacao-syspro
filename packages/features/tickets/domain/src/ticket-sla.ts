export type SlaState = {
  slaBreached: boolean;
  slaWarning: boolean;
  minutesToBreach: number | undefined;
  slaPaused: boolean;
};

type SlaInput = {
  status: string;
  slaResponseDueAt?: string | null;
  slaResolutionDueAt?: string | null;
  slaResponseHitAt?: string | null;
  slaResolutionHitAt?: string | null;
  closedAt?: string | null;
};

const SLA_PAUSED_STATUSES = ['WAITING_CUSTOMER', 'RESOLVED', 'ARCHIVED'];

export function calculateSlaState(ticket: SlaInput): SlaState {
  if (SLA_PAUSED_STATUSES.includes(ticket.status)) {
    return { slaBreached: false, slaWarning: false, minutesToBreach: undefined, slaPaused: true };
  }

  const now = Date.now();
  const responseDue = ticket.slaResponseDueAt ? Date.parse(ticket.slaResponseDueAt) : Number.NaN;
  const resolutionDue = ticket.slaResolutionDueAt ? Date.parse(ticket.slaResolutionDueAt) : Number.NaN;
  const activeDueDates = [
    !ticket.slaResponseHitAt && Number.isFinite(responseDue) ? responseDue : null,
    !ticket.slaResolutionHitAt && !ticket.closedAt && Number.isFinite(resolutionDue) ? resolutionDue : null,
  ].filter((v): v is number => typeof v === 'number');

  if (activeDueDates.length === 0) {
    return { slaBreached: false, slaWarning: false, minutesToBreach: undefined, slaPaused: false };
  }

  const nextDue = Math.min(...activeDueDates);
  const minutesToBreach = Math.ceil((nextDue - now) / 60_000);

  return {
    slaBreached: minutesToBreach <= 0,
    slaWarning: minutesToBreach > 0 && minutesToBreach <= 60,
    minutesToBreach,
    slaPaused: false,
  };
}
