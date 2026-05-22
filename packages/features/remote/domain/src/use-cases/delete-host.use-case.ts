import { deleteHostInputSchema, type DeleteHostOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function deleteHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<DeleteHostOutput> {
  const input = deleteHostInputSchema.parse(payload);
  return deps.port.deleteHost(input);
}
