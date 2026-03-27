import { hostAgentTokenInputSchema, type RevokeHostAgentTokenOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function revokeHostAgentToken(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RevokeHostAgentTokenOutput> {
  const input = hostAgentTokenInputSchema.parse(payload);
  return deps.port.revokeHostAgentToken(input);
}
