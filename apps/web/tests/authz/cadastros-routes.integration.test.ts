import { describe, expect, it } from "vitest";
import { CADASTROS_ROUTE_RULES, hasAllowedRole, type AppRole } from "@dosc-syspro/core";

const ALL_ROLES: AppRole[] = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN", "CLIENTE_USER"];

describe("authorization integration: /portal/cadastros route matrix", () => {
  it("mantem redirects e prefixes migrados para /portal", () => {
    expect(CADASTROS_ROUTE_RULES.root.redirectIfBlocked).toBe("/portal");
    expect(CADASTROS_ROUTE_RULES.root.redirectIfAllowed).toBe("/portal/cadastros/empresa");
    expect(CADASTROS_ROUTE_RULES.empresa.pathPrefix).toBe("/portal/cadastros/empresa");
    expect(CADASTROS_ROUTE_RULES.usuarios.pathPrefix).toBe("/portal/cadastros/usuarios");
    expect(CADASTROS_ROUTE_RULES.sistema.pathPrefix).toBe("/portal/cadastros/sistema");
  });

  it("bloqueia CLIENTE_USER no root /portal/cadastros", () => {
    expect(CADASTROS_ROUTE_RULES.root.blocked).toContain("CLIENTE_USER");
    expect(hasAllowedRole("CLIENTE_USER", CADASTROS_ROUTE_RULES.empresa.allowed)).toBe(false);
  });

  it("permite somente roles esperadas em /portal/cadastros/sistema", () => {
    for (const role of ALL_ROLES) {
      const allowed = hasAllowedRole(role, CADASTROS_ROUTE_RULES.sistema.allowed);
      if (role === "ADMIN" || role === "DEVELOPER" || role === "SUPORTE") {
        expect(allowed).toBe(true);
      } else {
        expect(allowed).toBe(false);
      }
    }
  });

  it("empresa e usuarios compartilham a mesma politica de acesso", () => {
    for (const role of ALL_ROLES) {
      expect(hasAllowedRole(role, CADASTROS_ROUTE_RULES.empresa.allowed)).toBe(
        hasAllowedRole(role, CADASTROS_ROUTE_RULES.usuarios.allowed),
      );
    }
  });
});
