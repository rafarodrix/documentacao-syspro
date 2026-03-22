import { prisma } from "@/lib/prisma";
import { TaxAnexosPanel } from "./TaxAnexosPanel";

export async function TaxAnexosContainer() {
  const anexos = await prisma.taxAnexo.findMany({
    orderBy: [{ code: "asc" }, { title: "asc" }],
    take: 500,
    select: {
      id: true,
      externalKey: true,
      code: true,
      title: true,
      description: true,
      category: true,
      publishDate: true,
      startDate: true,
      endDate: true,
      lastUpdated: true,
    },
  });

  return <TaxAnexosPanel items={anexos} />;
}

