import { hostAgentTokenInputSchema, type RotateHostAgentTokenOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function rotateHostAgentToken(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RotateHostAgentTokenOutput> {
  const input = hostAgentTokenInputSchema.parse(payload);
  return deps.port.rotateHostAgentToken(input);
}
