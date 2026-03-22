import { prisma } from "@/lib/prisma";
import { TaxCredPresumidoPanel } from "./TaxCredPresumidoPanel";

export async function TaxCredPresumidoContainer() {
  try {
    const items = await prisma.taxCredPresumido.findMany({
      orderBy: [{ code: "asc" }, { title: "asc" }],
      take: 300,
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
  } catch (error) {
    console.error("Erro ao carregar credito presumido:", error);
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Nao foi possivel carregar os dados de credito presumido. Verifique se a migration foi aplicada no banco.
      </div>
    );
  }
}
