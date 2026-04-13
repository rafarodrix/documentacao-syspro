import { createHostInputSchema, type CreateHostOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function createHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<CreateHostOutput> {
  const input = createHostInputSchema.parse(payload);
  return deps.port.createHost(input);
}
