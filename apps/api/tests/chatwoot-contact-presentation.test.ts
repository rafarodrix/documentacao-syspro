import { describe, expect, it } from "vitest";
import {
  buildChatwootContactDisplayName,
  cleanChatwootDisplayName,
  splitChatwootContactDisplayName,
} from "../../../packages/shared/src/chatwoot-contact-presentation";

describe("chatwoot contact presentation", () => {
  it("builds a composed label when contact and company are available", () => {
    expect(
      buildChatwootContactDisplayName({
        contactName: "Hernann",
        companyName: "Mega Eletron",
      }),
    ).toBe("Hernann \u00b7 Mega Eletron");
  });

  it("splits a composed Chatwoot label back into contact and company", () => {
    expect(splitChatwootContactDisplayName("Hernann \u00b7 Mega Eletron")).toEqual({
      contactName: "Hernann",
      companyName: "Mega Eletron",
    });
  });

  it("treats placeholder labels as empty", () => {
    expect(cleanChatwootDisplayName("Contato nao identificado")).toBeNull();
    expect(cleanChatwootDisplayName("Empresa nao vinculada")).toBeNull();
  });
});
