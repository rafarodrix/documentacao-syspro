import { prisma } from "@/lib/prisma";
import { TaxNcmPanel } from "./TaxNcmPanel";

export async function TaxNcmContainer() {
  const items = await prisma.taxNcm.findMany({
    orderBy: [{ code: "asc" }],
    take: 400,
    select: {
      id: true,
      code: true,
      description: true,
      startDate: true,
      endDate: true,
      replacedByCode: true,
      actType: true,
      actNumber: true,
      actYear: true,
      lastUpdated: true,
    },
  });

  return <TaxNcmPanel items={items} />;
}
