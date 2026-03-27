import { updateHostInputSchema, type UpdateHostOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function updateHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<UpdateHostOutput> {
  const input = updateHostInputSchema.parse(payload);
  return deps.port.updateHost(input);
}
