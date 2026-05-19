import "server-only";

import { callWebApi } from "@/lib/web-api";
import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

export type CustomerEmailOption = {
  companyId: string;
  email: string;
  companyName: string;
  legalName?: string | null;
  contactName: string | null;
};

export function parseCustomerEmailSearchParams(url: string) {
  const { searchParams } = new URL(url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limitRaw = Number(searchParams.get("limit") || DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limitRaw)))
    : DEFAULT_LIMIT;

  return { q, limit };
}

export async function findCustomerEmailOptions(input: { q: string; limit: number }): Promise<CustomerEmailOption[]> {
  const query = new URLSearchParams();
  query.set("q", input.q);
  query.set("limit", String(input.limit));

  const response = await callWebApi(`/api/tickets/customer-emails?${query.toString()}`)
    .then((res) => res.json() as Promise<{ options?: CustomerEmailOption[] }>);

  return Array.isArray(response.options) ? response.options : [];
}

export async function getCustomerEmailOptionsForCurrentUser(url: string) {
  const session = await getProtectedSession();
  const hasInternalTicketAccess = session && (await currentUserHasPermission("tickets:view_all"));
  if (!hasInternalTicketAccess) {
    return {
      authorized: false,
      options: [] as CustomerEmailOption[],
    };
  }

  const { q, limit } = parseCustomerEmailSearchParams(url);
  const options = await findCustomerEmailOptions({ q, limit });

  return {
    authorized: true,
    options,
  };
}
