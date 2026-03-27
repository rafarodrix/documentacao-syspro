import { deleteHostInputSchema, type DeleteHostOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function deleteHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<DeleteHostOutput> {
  const input = deleteHostInputSchema.parse(payload);
  return deps.port.deleteHost(input);
}
