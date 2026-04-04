import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import {
  getZammadGlobalCatalogSnapshot,
  saveZammadGlobalCatalogSnapshot,
} from "@/features/tickets/application/zammad-global-settings-server";
import {
  zammadGlobalCatalogSchema,
  type ZammadGlobalCatalog,
} from "@dosc-syspro/contracts";

export type ZammadCatalogLoadResult = {
  catalog: ZammadGlobalCatalog | null;
  source: "live" | "snapshot" | null;
  warning: string | null;
};

export async function loadZammadCatalogWithFallback(routeKey: string): Promise<ZammadCatalogLoadResult> {
  try {
    const liveCatalogRaw = await ZammadGateway.getGlobalCatalog(routeKey);
    const liveValidation = zammadGlobalCatalogSchema.safeParse(liveCatalogRaw);
    if (!liveValidation.success) {
      const issues = liveValidation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | ');
      console.error("[ZammadGlobalCatalog] Parse Failed:", JSON.stringify(liveValidation.error.issues, null, 2));
      throw new Error(`catalog_live_parse_failed: ${issues}`);
    }

    await saveZammadGlobalCatalogSnapshot(liveValidation.data);
    return { catalog: liveValidation.data, source: "live", warning: null };
  } catch (error) {
    const snapshot = await getZammadGlobalCatalogSnapshot();
    if (snapshot) {
      return {
        catalog: snapshot,
        source: "snapshot",
        warning: "Catalogo carregado do ultimo snapshot salvo. Dados possivelmente desatualizados (Zammad indisponivel).",
      };
    }

    console.error("Erro ao carregar catalogo global do Zammad:", error);
    return {
      catalog: null,
      source: null,
      warning: "Nao foi possivel carregar o catalogo do Zammad e nao existe snapshot salvo.",
    };
  }
}
