import { describe, expect, it } from "vitest";
import {
  AGENT_COLLECTION_PROFILE_LABEL,
  getCollectorsPolicyForProfile,
  mapMachineProfileToCollectionProfile,
  resolveDeviceCollectionDesiredState,
} from "@dosc-syspro/contracts/agent";

describe("collection-profile", () => {
  it("maps portal machine profiles to collection profiles", () => {
    expect(mapMachineProfileToCollectionProfile("SERVER", true)).toBe("server_syspro");
    expect(mapMachineProfileToCollectionProfile("WORKSTATION", true)).toBe("workstation");
    expect(mapMachineProfileToCollectionProfile("TERMINAL", true)).toBe("terminal");
    expect(mapMachineProfileToCollectionProfile("BACKUP_NODE", true)).toBe("backup_node");
    expect(mapMachineProfileToCollectionProfile(null, true)).toBe("workstation");
    expect(mapMachineProfileToCollectionProfile("SERVER", false)).toBe("unlinked");
  });

  it("keeps server profile as full RMM footprint", () => {
    const collectors = getCollectorsPolicyForProfile("server_syspro");
    expect(collectors.all_services.enabled).toBe(true);
    expect(collectors.syspro_versions.enabled).toBe(true);
    expect(collectors.critical_events.enabled).toBe(true);
    expect(collectors.metrics.interval_seconds).toBe(60);
  });

  it("disables expensive collectors on workstation and unlinked", () => {
    expect(getCollectorsPolicyForProfile("workstation").all_services.enabled).toBe(false);
    expect(getCollectorsPolicyForProfile("unlinked").syspro_versions.enabled).toBe(false);
    expect(getCollectorsPolicyForProfile("unlinked").software.enabled).toBe(false);
    expect(getCollectorsPolicyForProfile("terminal").critical_events.enabled).toBe(false);
  });

  it("resolves desired-state aggregate flags from profile", () => {
    const server = resolveDeviceCollectionDesiredState({
      linked: true,
      machineProfile: "SERVER",
    });
    expect(server.collection_profile).toBe("server_syspro");
    expect(server.collect_inventory).toBe(true);
    expect(server.collect_metrics).toBe(true);
    expect(AGENT_COLLECTION_PROFILE_LABEL[server.collection_profile]).toBe("Servidor Syspro");

    const unlinked = resolveDeviceCollectionDesiredState({ linked: false });
    expect(unlinked.collection_profile).toBe("unlinked");
    expect(unlinked.collectors.syspro_versions.enabled).toBe(false);
  });
});
