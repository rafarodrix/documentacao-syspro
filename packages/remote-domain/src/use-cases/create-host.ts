import { createHostInputSchema, type CreateHostOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function createHost(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<CreateHostOutput> {
  const input = createHostInputSchema.parse(payload);
  return deps.port.createHost(input);
}
