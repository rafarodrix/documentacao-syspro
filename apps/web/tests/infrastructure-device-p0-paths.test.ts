import { describe, expect, it } from "vitest";
import {
  deviceDetailHref,
  deviceDetailPath,
  isDiscoveredDeviceListItem,
  parseHostDetailsTab,
} from "@/features/infrastructure/device/domain/device-detail-paths";
import { parseOperationsView } from "@/features/remote/interface/operations-view";

describe("deviceDetailPath", () => {
  it("routes discovered and ignored discovered rows to descobertos", () => {
    expect(
      deviceDetailPath({ id: "disc-1", lifecycle: "DISCOVERED", agentInstallationId: null }),
    ).toBe("/portal/infraestrutura/dispositivos/descobertos/disc-1");

    expect(
      isDiscoveredDeviceListItem({ lifecycle: "ARCHIVED", agentInstallationId: null }),
    ).toBe(true);

    expect(
      deviceDetailPath({ id: "disc-2", lifecycle: "ARCHIVED", agentInstallationId: null }),
    ).toBe("/portal/infraestrutura/dispositivos/descobertos/disc-2");
  });

  it("routes managed and awaiting-link rows to dispositivos", () => {
    expect(
      deviceDetailPath({ id: "host-1", lifecycle: "MANAGED", agentInstallationId: "ainst_1" }),
    ).toBe("/portal/infraestrutura/dispositivos/host-1");

    expect(
      deviceDetailPath({ id: "host-2", lifecycle: "AWAITING_LINK", agentInstallationId: "ainst_2" }),
    ).toBe("/portal/infraestrutura/dispositivos/host-2");

    expect(
      deviceDetailPath({ id: "host-3", lifecycle: "ARCHIVED", agentInstallationId: "ainst_3" }),
    ).toBe("/portal/infraestrutura/dispositivos/host-3");
  });

  it("builds deep-link query strings for managed details", () => {
    expect(
      deviceDetailHref(
        { id: "host-1", lifecycle: "MANAGED", agentInstallationId: "ainst_1" },
        { tab: "diagnostico" },
      ),
    ).toBe("/portal/infraestrutura/dispositivos/host-1?tab=diagnostico");

    expect(
      deviceDetailHref(
        { id: "host-1", lifecycle: "MANAGED", agentInstallationId: "ainst_1" },
        { edit: true },
      ),
    ).toBe("/portal/infraestrutura/dispositivos/host-1?edit=true");
  });
});

describe("parseHostDetailsTab", () => {
  it("accepts known tabs and falls back to geral", () => {
    expect(parseHostDetailsTab("eventos")).toBe("eventos");
    expect(parseHostDetailsTab("unknown")).toBe("geral");
    expect(parseHostDetailsTab(null)).toBe("geral");
  });
});

describe("parseOperationsView", () => {
  it("normalizes legacy aliases", () => {
    expect(parseOperationsView("ativas")).toBe("em_andamento");
    expect(parseOperationsView("historico")).toBe("concluidas");
    expect(parseOperationsView("requer_acao")).toBe("requer_acao");
    expect(parseOperationsView("")).toBe("em_andamento");
  });
});

describe("normalizeRustDeskId", () => {
  it("strips spaces from rustdesk ids", async () => {
    const { normalizeRustDeskId, buildRustDeskHref } = await import(
      "@/features/infrastructure/device/hooks/use-rustdesk-connect"
    );
    expect(normalizeRustDeskId("123 456 789")).toBe("123456789");
    expect(buildRustDeskHref("123 456", false)).toBe("rustdesk://123456");
    expect(buildRustDeskHref("123 456", true)).toBe("rustdesk://[123456]");
    expect(buildRustDeskHref("   ", false)).toBeNull();
  });
});

describe("device-presentation", () => {
  it("formats rustdesk and pending subtitle", async () => {
    const { formatRustDeskDisplay, buildPendingIdentitySubtitle, getHeartbeatMetaAt } = await import(
      "@/features/infrastructure/device/domain/device-presentation"
    );
    expect(formatRustDeskDisplay("123456789")).toBe("123 456 789");
    expect(
      buildPendingIdentitySubtitle({
        rustdeskId: "123456789",
        agentVersion: "1.2.3",
        lastHeartbeatAt: null,
      }),
    ).toContain("agente 1.2.3");
    expect(getHeartbeatMetaAt(null, Date.now()).bucket).toBe("never");
  });
});
