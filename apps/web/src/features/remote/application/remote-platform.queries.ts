import type {
  RemoteDiscoveredHostDetails,
  RemoteHostDetails,
  RemotePlatformDirectory,
  RemotePlatformOverview,
  RemoteTenantScope,
} from "@/features/remote/domain/remote-host.types";
import { trpc } from "@/lib/api/trpc-client";

export async function getRemotePlatformOverview(_tenantScope: RemoteTenantScope): Promise<RemotePlatformOverview> {
  return trpc.remote.overview.query() as Promise<RemotePlatformOverview>;
}

export async function getRemoteHostDetails(
  _tenantScope: RemoteTenantScope,
  hostId: string,
): Promise<RemoteHostDetails | null> {
  return trpc.remote.hostDetails.query({ hostId }) as Promise<RemoteHostDetails | null>;
}

export async function getRemoteDiscoveredHostDetails(
  _tenantScope: RemoteTenantScope,
  discoveredHostId: string,
): Promise<RemoteDiscoveredHostDetails | null> {
  return trpc.remote.discoveredHostDetails.query({ discoveredHostId }) as Promise<RemoteDiscoveredHostDetails | null>;
}

export async function searchRemoteCompanies(_tenantScope: RemoteTenantScope, query = "") {
  const result = (await trpc.remote.searchCompanies.query({ q: query })) as {
    success: boolean;
    data: { options: Array<{ id: string; label: string; searchText: string }> };
  };
  return result.data?.options ?? [];
}
