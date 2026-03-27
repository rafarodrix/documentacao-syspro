import { linkDiscoveredHostInputSchema, type LinkDiscoveredHostOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function linkDiscoveredHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<LinkDiscoveredHostOutput> {
  const input = linkDiscoveredHostInputSchema.parse(payload);
  return deps.port.linkDiscoveredHost(input);
}
