import "server-only";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

export type CustomerEmailOption = {
  email: string;
  companyName: string;
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
  const rows = await prisma.companyContact.findMany({
    where: {
      email: { not: null },
      status: "LINKED",
      companyLinks: {
        some: {
          company: {
            deletedAt: null,
          },
        },
      },
      ...(input.q
        ? {
            email: {
              contains: input.q,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: [{ email: "asc" }],
    select: {
      email: true,
      companyLinks: {
        where: {
          company: {
            deletedAt: null,
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          company: {
            select: {
              nomeFantasia: true,
              razaoSocial: true,
            },
          },
        },
      },
    },
    take: input.limit * 2,
  });

  const dedup = new Map<string, CustomerEmailOption>();
  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    if (!email || dedup.has(email)) continue;
    const company = row.companyLinks[0]?.company;
    dedup.set(email, {
      email,
      companyName: company?.nomeFantasia?.trim() || company?.razaoSocial || "",
    });
    if (dedup.size >= input.limit) break;
  }

  return Array.from(dedup.values());
}

export async function getCustomerEmailOptionsForCurrentUser(url: string) {
  const session = await getProtectedSession();
  const canAccess = session && await currentUserHasPermission("tools:all");
  if (!canAccess) {
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
