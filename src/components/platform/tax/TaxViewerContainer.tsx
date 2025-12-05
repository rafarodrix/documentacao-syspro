import { prisma } from "@/lib/prisma";
import { TaxRulesViewer } from "./TaxRulesViewer";

export async function TaxViewerContainer() {
    // Busca CSTs ordenados, INCLUINDO as classificações filhas
    const data = await prisma.taxCST.findMany({
        orderBy: { cst: "asc" },
        include: {
            classifications: {
                orderBy: { code: "asc" }
            }
        }
    });

    return <TaxRulesViewer data={data} />;
}