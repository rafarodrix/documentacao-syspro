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

export async function getRemotePlatformDirectory(_tenantScope: RemoteTenantScope): Promise<RemotePlatformDirectory> {
  return trpc.remote.directory.query() as Promise<RemotePlatformDirectory>;
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
