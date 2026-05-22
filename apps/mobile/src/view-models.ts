import type { TicketModuleStatus, TicketModulePriority } from "@dosc-syspro/contracts";
import type { Release } from "@dosc-syspro/core";
import { formatRecency } from "@dosc-syspro/shared";

export type Ticket = {
  id: string | number;
  number: string;
  subject: string;
  status: TicketModuleStatus;
  priority: TicketModulePriority;
  lastUpdate: string;
};

export type MobileTicketListItem = Pick<Ticket, "id" | "subject" | "status" | "priority" | "number"> & {
  updatedLabel: string;
};

export type MobileReleaseListItem = Pick<Release, "id" | "title" | "type"> & {
  updatedLabel: string;
};

export function toMobileTicketListItem(ticket: Ticket): MobileTicketListItem {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    number: ticket.number,
    updatedLabel: formatRecency(ticket.lastUpdate),
  };
}

export function toMobileReleaseListItem(release: Release): MobileReleaseListItem {
  return {
    id: release.id,
    title: release.title,
    type: release.type,
    updatedLabel: formatRecency(release.isoDate),
  };
}
