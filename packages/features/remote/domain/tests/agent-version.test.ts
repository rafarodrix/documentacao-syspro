import { describe, expect, it } from "vitest";
import {
  compareAgentSemver,
  isAgentVersionBelowTarget,
  supportsManagedAgentUpgrade,
} from "@dosc-syspro/contracts/remote";

describe("agent-version helpers", () => {
  it("compares semver", () => {
    expect(compareAgentSemver("1.0.85", "1.0.89")).toBe(-1);
    expect(compareAgentSemver("1.0.89", "1.0.89")).toBe(0);
    expect(compareAgentSemver("1.1.0", "1.0.89")).toBe(1);
  });

  it("detects below target", () => {
    expect(isAgentVersionBelowTarget("1.0.88", "1.0.89")).toBe(true);
    expect(isAgentVersionBelowTarget("1.0.89", "1.0.89")).toBe(false);
  });

  it("gates managed upgrade at 1.0.85", () => {
    expect(supportsManagedAgentUpgrade("1.0.84")).toBe(false);
    expect(supportsManagedAgentUpgrade("1.0.85")).toBe(true);
  });
});
