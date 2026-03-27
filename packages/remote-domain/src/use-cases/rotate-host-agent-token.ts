import { hostAgentTokenInputSchema, type RotateHostAgentTokenOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function rotateHostAgentToken(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RotateHostAgentTokenOutput> {
  const input = hostAgentTokenInputSchema.parse(payload);
  return deps.port.rotateHostAgentToken(input);
}
