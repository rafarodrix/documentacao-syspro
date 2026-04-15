import "server-only";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

export type CustomerEmailOption = {
  companyId: string;
  email: string;
  companyName: string;
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
            OR: [
              {
                email: {
                  contains: input.q,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: input.q,
                  mode: "insensitive",
                },
              },
              {
                companyLinks: {
                  some: {
                    company: {
                      deletedAt: null,
                      OR: [
                        {
                          nomeFantasia: {
                            contains: input.q,
                            mode: "insensitive",
                          },
                        },
                        {
                          razaoSocial: {
                            contains: input.q,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      name: true,
      email: true,
      companyLinks: {
        where: {
          company: {
            deletedAt: null,
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          companyId: true,
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
    if (!email) continue;

    for (const link of row.companyLinks) {
      const companyName = link.company?.nomeFantasia?.trim() || link.company?.razaoSocial || "";
      if (!companyName) continue;

      const dedupKey = `${email}:${link.companyId}`;
      if (dedup.has(dedupKey)) continue;

      dedup.set(dedupKey, {
        companyId: link.companyId,
        email,
        companyName,
        contactName: row.name?.trim() || null,
      });

      if (dedup.size >= input.limit) {
        return Array.from(dedup.values());
      }
    }
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
