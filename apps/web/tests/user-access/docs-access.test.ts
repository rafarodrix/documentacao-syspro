import { describe, expect, it } from "vitest";

import {
  canUserAccessDocUrl,
  isAdminOnlyDocUrl,
} from "@/lib/docs-access";

describe("docs access by scope", () => {
  it("detects admin-only docs by canonical url", () => {
    expect(isAdminOnlyDocUrl("/portal/docs/suporte/documentacao-docs-interna")).toBe(true);
    expect(isAdminOnlyDocUrl("/portal/docs/cliente/cadastro")).toBe(false);
  });

  it("blocks support and admin scopes for client roles", async () => {
    await expect(
      canUserAccessDocUrl({
        url: "/portal/docs/suporte/documentacao-docs-interna",
        userId: "user-1",
        role: "CLIENTE_USER",
      }),
    ).resolves.toBe(false);

    await expect(
      canUserAccessDocUrl({
        url: "/portal/docs/admin",
        userId: "user-1",
        role: "CLIENTE_ADMIN",
      }),
    ).resolves.toBe(false);
  });

  it("allows canonical docs for their matching scope", async () => {
    await expect(
      canUserAccessDocUrl({
        url: "/portal/docs/cliente/primeiros-passos",
        userId: "user-1",
        role: "CLIENTE_USER",
      }),
    ).resolves.toBe(true);

    await expect(
      canUserAccessDocUrl({
        url: "/portal/docs/suporte",
        userId: "user-1",
        role: "SUPORTE",
      }),
    ).resolves.toBe(true);

    await expect(
      canUserAccessDocUrl({
        url: "/portal/docs/admin",
        userId: "user-1",
        role: "ADMIN",
      }),
    ).resolves.toBe(true);
  });
});
