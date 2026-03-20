import { describe, expect, it } from "vitest";
import { LEGACY_ADMIN_DUPLICATED_ROUTES_COUNT, mapLegacyAdminPathToApp } from "@/core/config/platform-route-aliases";

describe("platform integration: legacy /admin aliases", () => {
  it("mantem o total de 14 rotas legadas mapeadas", () => {
    expect(LEGACY_ADMIN_DUPLICATED_ROUTES_COUNT).toBe(14);
  });

  it("mapeia raiz e rotas principais para /app", () => {
    expect(mapLegacyAdminPathToApp("/admin")).toBe("/app");
    expect(mapLegacyAdminPathToApp("/admin/cadastros")).toBe("/app/cadastros");
    expect(mapLegacyAdminPathToApp("/admin/chamados")).toBe("/app/chamados");
    expect(mapLegacyAdminPathToApp("/admin/tools/visualizador-danfe")).toBe("/app/tools/visualizador-danfe");
  });

  it("mapeia rota dinamica de ticket", () => {
    expect(mapLegacyAdminPathToApp("/admin/chamados/12345")).toBe("/app/chamados/12345");
  });

  it("ignora caminhos fora do escopo /admin", () => {
    expect(mapLegacyAdminPathToApp("/app/chamados")).toBeNull();
    expect(mapLegacyAdminPathToApp("/login")).toBeNull();
  });
});
