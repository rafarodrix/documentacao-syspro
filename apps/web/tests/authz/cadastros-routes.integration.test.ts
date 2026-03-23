import { describe, expect, it } from "vitest";
import { CADASTROS_ROUTE_RULES, hasAllowedRole, type AppRole } from "@/core/config/route-access";

const ALL_ROLES: AppRole[] = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN", "CLIENTE_USER"];

describe("authorization integration: /app/cadastros route matrix", () => {
  it("bloqueia CLIENTE_USER no root /app/cadastros", () => {
    expect(CADASTROS_ROUTE_RULES.root.blocked).toContain("CLIENTE_USER");
    expect(hasAllowedRole("CLIENTE_USER", CADASTROS_ROUTE_RULES.empresa.allowed)).toBe(false);
  });

  it("permite somente roles esperadas em /app/cadastros/sistema", () => {
    for (const role of ALL_ROLES) {
      const allowed = hasAllowedRole(role, CADASTROS_ROUTE_RULES.sistema.allowed);
      if (role === "ADMIN" || role === "DEVELOPER" || role === "SUPORTE") {
        expect(allowed).toBe(true);
      } else {
        expect(allowed).toBe(false);
      }
    }
  });

  it("empresa e usuarios compartilham mesma política de acesso", () => {
    for (const role of ALL_ROLES) {
      expect(hasAllowedRole(role, CADASTROS_ROUTE_RULES.empresa.allowed)).toBe(
        hasAllowedRole(role, CADASTROS_ROUTE_RULES.usuarios.allowed),
      );
    }
  });
});
