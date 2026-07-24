import { describe, expect, it } from "vitest";
import { canUseChatwootLazyLauncher } from "@/features/chatwoot/domain/chatwoot-lazy-launcher-access";

describe("canUseChatwootLazyLauncher", () => {
  it.each(["CLIENTE_ADMIN", "CLIENTE_USER"] as const)("permite o lancador para %s", (role) => {
    expect(canUseChatwootLazyLauncher(role)).toBe(true);
  });

  it.each(["ADMIN", "SUPORTE", "DEVELOPER", null, undefined] as const)(
    "oculta o lancador para %s",
    (role) => {
      expect(canUseChatwootLazyLauncher(role)).toBe(false);
    },
  );
});
