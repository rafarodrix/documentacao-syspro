import { prisma } from "@/lib/prisma";
import { SEFAZ_ENDPOINTS, analyzeSefazResponse } from "@/core/constants/sefaz-endpoints";

export class SefazService {
    async runFullCheck() {
        console.log("Iniciando monitoramento nacional SEFAZ...");

        const results = await Promise.allSettled(
            SEFAZ_ENDPOINTS.map(async (endpoint) => {
                const start = Date.now();

                try {
                    const response = await fetch(endpoint.url, {
                        method: "GET",
                        // Node 18+
                        // @ts-ignore
                        signal: AbortSignal.timeout(8000),
                    });

                    const latency = Date.now() - start;
                    const status = analyzeSefazResponse(latency, response.status);

                    return {
                        uf: endpoint.uf,
                        service: endpoint.service,
                        status,
                        latency,
                    };
                } catch {
                    return {
                        uf: endpoint.uf,
                        service: endpoint.service,
                        status: "OFFLINE",
                        latency: 0,
                    };
                }
            })
        );

        const dataToSave = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
            .map((r) => r.value);

        if (dataToSave.length > 0) {
            await prisma.sefazStatus.createMany({
                data: dataToSave,
            });
        }

        return { count: dataToSave.length };
    }

    async getLatestByUF(uf: string) {
        return prisma.sefazStatus.findMany({
            where: { uf },
            take: 50,
            orderBy: { createdAt: "desc" },
        });
    }
}
