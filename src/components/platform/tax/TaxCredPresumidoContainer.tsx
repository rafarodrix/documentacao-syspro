import { prisma } from "@/lib/prisma";
import { TaxCredPresumidoPanel } from "./TaxCredPresumidoPanel";

export async function TaxCredPresumidoContainer() {
  const items = await prisma.taxCredPresumido.findMany({
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
    },
  });

  return <TaxCredPresumidoPanel items={items} />;
}

