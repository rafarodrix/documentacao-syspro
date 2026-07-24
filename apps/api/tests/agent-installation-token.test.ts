import { describe, expect, it } from "vitest";
import {
  AGENT_INSTALLATION_TOKEN_HEADER,
  buildAgentInstallationToken,
  hashAgentInstallationToken,
  readInstallationTokenHeader,
} from "../src/modules/agents/agent-installation-token";

describe("agent installation token", () => {
  it("builds opaque tokens with stable prefix", () => {
    const token = buildAgentInstallationToken();
    expect(token.startsWith("ainst_")).toBe(true);
    expect(token.length).toBeGreaterThan(20);
  });

  it("hashes tokens with sha-256 hex", () => {
    const hash = hashAgentInstallationToken("ainst_demo");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAgentInstallationToken("ainst_demo")).toBe(hash);
    expect(hashAgentInstallationToken("ainst_other")).not.toBe(hash);
  });

  it("reads installation token header case-insensitively enough for express", () => {
    expect(
      readInstallationTokenHeader({
        [AGENT_INSTALLATION_TOKEN_HEADER]: " ainst_abc ",
      }),
    ).toBe("ainst_abc");
    expect(
      readInstallationTokenHeader({
        [AGENT_INSTALLATION_TOKEN_HEADER]: ["ainst_array"],
      }),
    ).toBe("ainst_array");
    expect(readInstallationTokenHeader({})).toBeUndefined();
  });
});
