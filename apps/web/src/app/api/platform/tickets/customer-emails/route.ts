import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

type CustomerEmailOption = {
  email: string;
  companyName: string;
};

export async function GET(request: Request) {
  try {
    const session = await getProtectedSession();
    const canAccess = session && await currentUserHasPermission("tools:all");
    if (!canAccess) {
      return NextResponse.json({ options: [] as CustomerEmailOption[] }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const limitRaw = Number(searchParams.get("limit") || DEFAULT_LIMIT);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limitRaw)))
      : DEFAULT_LIMIT;

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
        ...(q
          ? {
              email: {
                contains: q,
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
      take: limit * 2,
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
      if (dedup.size >= limit) break;
    }

    const options = Array.from(dedup.values());
    return NextResponse.json({ options });
  } catch (error) {
    console.error("customer-emails route error:", error);
    return NextResponse.json({ options: [] as CustomerEmailOption[] }, { status: 500 });
  }
}
