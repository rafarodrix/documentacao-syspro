import { updateHostInputSchema, type UpdateHostOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function updateHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<UpdateHostOutput> {
  const input = updateHostInputSchema.parse(payload);
  return deps.port.updateHost(input);
}
