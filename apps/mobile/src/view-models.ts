import type { Ticket, Release } from "@dosc-syspro/core";
import { formatRecency } from "@dosc-syspro/shared";

export type MobileTicketListItem = Pick<Ticket, "id" | "title" | "status" | "priority" | "number"> & {
  updatedLabel: string;
};

export type MobileReleaseListItem = Pick<Release, "slug" | "title" | "category"> & {
  updatedLabel: string;
};

export function toMobileTicketListItem(ticket: Ticket): MobileTicketListItem {
  return {
    id: ticket.id,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    number: ticket.number,
    updatedLabel: formatRecency(ticket.updatedAt),
  };
}

export function toMobileReleaseListItem(release: Release): MobileReleaseListItem {
  return {
    slug: release.slug,
    title: release.title,
    category: release.category,
    updatedLabel: formatRecency(release.updatedAt),
  };
}