import { prisma } from "@/lib/prisma";
import { analyzeSefazResponse, buildDefaultSefazRoutes } from "@dosc-syspro/contracts";
import { SETTING_KEYS } from "@dosc-syspro/contracts";
import { sefazRoutesSchema } from "@dosc-syspro/contracts";
import { createLogger } from "@/lib/observability/logger";

type SefazCheckResult = {
    uf: string;
    service: string;
    status: string;
    latency: number;
};

export class SefazService {
    private readonly logger;

    constructor(correlationId?: string) {
        this.logger = createLogger({
            area: "service",
            feature: "sefaz",
            correlationId: correlationId ?? null,
        });
    }

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
            this.logger.error("sefaz.routes.load_failed", error);
            return buildDefaultSefazRoutes();
        }
    }

    async runFullCheck() {
        this.logger.info("sefaz.check.started");
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
            .filter((r): r is PromiseFulfilledResult<SefazCheckResult> => r.status === "fulfilled")
            .map((r) => r.value);

        if (dataToSave.length > 0) {
            await prisma.sefazStatus.createMany({
                data: dataToSave,
            });
        }

        this.logger.info("sefaz.check.finished", {
            checkedRoutes: endpoints.length,
            persistedResults: dataToSave.length,
        });

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
