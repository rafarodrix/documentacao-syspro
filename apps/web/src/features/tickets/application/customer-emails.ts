import "server-only";
import { z } from "zod";

import { callWebApi } from "@/lib/web-api";
import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

export type CustomerEmailOption = {
  companyId: string;
  email: string;
  companyName: string;
  legalName?: string | null;
  cnpj?: string | null;
  contactName: string | null;
};

export const customerEmailQueryParamsSchema = z.object({
  q: z.string().default(""),
  limit: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return undefined;
      const num = Number(val);
      return Number.isNaN(num) ? undefined : num;
    },
    z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  ),
});

export function parseCustomerEmailSearchParams(url: string) {
  const { searchParams } = new URL(url);
  const parsed = customerEmailQueryParamsSchema.safeParse({
    q: searchParams.get("q")?.trim() || undefined,
    limit: searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return { q: "", limit: DEFAULT_LIMIT };
  }

  return {
    q: parsed.data.q.toLowerCase(),
    limit: parsed.data.limit,
  };
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
  const hasInternalTicketAccess =
    session &&
    (await currentUserHasAnyPermission(
      ["tickets:view_all", "tickets:view_own", "tickets:manage"],
      { acceptCompanyScope: true },
    ));
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
