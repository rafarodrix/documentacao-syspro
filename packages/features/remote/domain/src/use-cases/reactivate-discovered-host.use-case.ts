import type { RemoteHostAdminPort } from "../remote-domain.port";
import { reactivateDiscoveredHostInputSchema, type ReactivateDiscoveredHostOutput } from "../remote-domain.contracts";

export async function reactivateDiscoveredHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<ReactivateDiscoveredHostOutput> {
  const input = reactivateDiscoveredHostInputSchema.parse(payload);
  return deps.port.reactivateDiscoveredHost(input);
}
