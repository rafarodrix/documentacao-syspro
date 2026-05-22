import { hostAgentTokenInputSchema, type RevokeHostAgentTokenOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function revokeHostAgentToken(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RevokeHostAgentTokenOutput> {
  const input = hostAgentTokenInputSchema.parse(payload);
  return deps.port.revokeHostAgentToken(input);
}
