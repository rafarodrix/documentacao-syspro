import type { QueueKey, TicketStatusGroup } from "@/core/config/tickets-workflow";
import type { TicketListItem, TicketStatusCounts } from "@/features/tickets/domain/model";

export type TicketCacheQuery = {
  customerEmails?: string[];
  zammadUserId?: number | null;
  queue?: QueueKey;
  search?: string;
  statusGroup?: TicketStatusGroup | "all";
  page: number;
  pageSize: number;
};

export type TicketCacheResult = {
  rows: TicketListItem[];
  total: number | null;
  queueCounts: Record<QueueKey, number>;
  statusCounts: TicketStatusCounts;
};

export interface TicketCacheRepository {
  listTickets(input: TicketCacheQuery): Promise<TicketCacheResult>;
}
