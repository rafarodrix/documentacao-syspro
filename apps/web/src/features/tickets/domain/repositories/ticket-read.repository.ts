import type { Role } from "@prisma/client";
import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";
import type {
  TicketListItem,
  TicketStatusCounts,
  TicketsPagination,
} from "@/features/tickets/domain/ticket-model";

export type TicketViewerScope = {
  userId: string;
  email: string;
  role: Role;
};

export type TicketReadQuery = {
  viewer: TicketViewerScope;
  page: number;
  pageSize: number;
  queue?: QueueKey;
  search?: string;
  statusGroup?: TicketStatusGroup | "all";
};

export type TicketReadResult = {
  data: TicketListItem[];
  pagination: TicketsPagination;
  queueCounts: Record<QueueKey, number>;
  statusCounts: TicketStatusCounts;
  staleWarning?: string;
};

export interface TicketReadRepository {
  listTickets(input: TicketReadQuery): Promise<TicketReadResult>;
  listScopedCompanyTicketEmails(userId: string): Promise<string[]>;
}
