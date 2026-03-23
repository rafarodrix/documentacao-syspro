import { prisma } from "@/lib/prisma";
import { analyzeSefazResponse, buildDefaultSefazRoutes } from "@/core/constants/sefaz-endpoints";
import { SETTING_KEYS } from "@/core/application/schema/settings-schema";
import { sefazRoutesSchema } from "@/core/application/schema/sefaz-routes-schema";

export class SefazService {
    private async loadConfiguredEndpoints() {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: SETTING_KEYS.SEFAZ_ROUTES },
            select: { value: true },
        });

        if (!setting?.value) {
            return buildDefaultSefazRoutes();
        }

        try {
            const parsed = JSON.parse(setting.value);
            const validation = sefazRoutesSchema.safeParse(parsed);
            if (!validation.success) throw new Error("Rotas SEFAZ invalidas.");
            return validation.data.filter((route) => route.active);
        } catch (error) {
            console.error("Erro ao ler rotas SEFAZ configuradas, usando padrao:", error);
            return buildDefaultSefazRoutes();
        }
    }

    async runFullCheck() {
        console.log("Iniciando monitoramento nacional SEFAZ...");
        const endpoints = await this.loadConfiguredEndpoints();

        const results = await Promise.allSettled(
            endpoints.map(async (endpoint) => {
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
