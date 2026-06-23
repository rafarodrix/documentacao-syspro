import { ignoreDiscoveredHostInputSchema, type IgnoreDiscoveredHostOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function ignoreDiscoveredHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<IgnoreDiscoveredHostOutput> {
  const input = ignoreDiscoveredHostInputSchema.parse(payload);
  return deps.port.ignoreDiscoveredHost(input);
}
