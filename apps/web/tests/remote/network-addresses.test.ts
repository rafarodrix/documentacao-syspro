import { describe, expect, it } from "vitest";
import { resolveRemoteNetworkFields } from "@/features/remote/interface/host-details/network-addresses";

describe("resolveRemoteNetworkFields", () => {
  it("keeps local and public IPs separated when lastKnownIp is public", () => {
    const result = resolveRemoteNetworkFields({
      networkSnapshot: {
        localIp: "192.168.0.10",
        publicIp: "177.54.10.20",
        gateway: "192.168.0.1",
      },
      systemSnapshot: null,
      lastKnownIp: "177.54.10.20",
    });

    expect(result).toEqual({
      localIpv4: "192.168.0.10",
      publicIpv4: "177.54.10.20",
      localGateway: "192.168.0.1",
    });
  });

  it("does not reuse a public lastKnownIp as local IPv4 fallback", () => {
    const result = resolveRemoteNetworkFields({
      networkSnapshot: null,
      systemSnapshot: null,
      lastKnownIp: "8.8.8.8",
    });

    expect(result.localIpv4).toBeNull();
    expect(result.publicIpv4).toBe("8.8.8.8");
  });

  it("extracts values from nested payloads when keys vary", () => {
    const result = resolveRemoteNetworkFields({
      networkSnapshot: {
        adapters: [
          {
            info: {
              primaryIp: "10.0.0.15",
              defaultGateway: "10.0.0.1",
            },
          },
        ],
        internet: {
          externalAddress: "187.22.30.40",
        },
      },
      systemSnapshot: null,
      lastKnownIp: null,
    });

    expect(result).toEqual({
      localIpv4: "10.0.0.15",
      publicIpv4: "187.22.30.40",
      localGateway: "10.0.0.1",
    });
  });
});
