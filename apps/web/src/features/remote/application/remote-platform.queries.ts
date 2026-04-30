import type {
  RemoteHostDetails,
  RemotePlatformDirectory,
  RemotePlatformOverview,
  RemoteTenantScope,
} from "@/features/remote/domain/model";
import {
  fetchRemoteHostDetailsGateway,
  fetchRemotePlatformDirectoryGateway,
  fetchRemotePlatformOverviewGateway,
} from "@/features/remote/infrastructure/gateways/remote-admin.gateway";

export async function getRemotePlatformOverview(_tenantScope: RemoteTenantScope): Promise<RemotePlatformOverview> {
  return fetchRemotePlatformOverviewGateway();
}

export async function getRemotePlatformDirectory(_tenantScope: RemoteTenantScope): Promise<RemotePlatformDirectory> {
  return fetchRemotePlatformDirectoryGateway();
}

export async function getRemoteHostDetails(
  _tenantScope: RemoteTenantScope,
  hostId: string,
): Promise<RemoteHostDetails | null> {
  return fetchRemoteHostDetailsGateway(hostId);
}
