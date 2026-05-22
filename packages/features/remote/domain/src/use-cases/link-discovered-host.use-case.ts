import { linkDiscoveredHostInputSchema, type LinkDiscoveredHostOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function linkDiscoveredHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<LinkDiscoveredHostOutput> {
  const input = linkDiscoveredHostInputSchema.parse(payload);
  return deps.port.linkDiscoveredHost(input);
}
