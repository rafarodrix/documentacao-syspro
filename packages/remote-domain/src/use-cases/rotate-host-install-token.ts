import { hostAgentTokenInputSchema, type RotateHostInstallTokenOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function rotateHostInstallToken(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RotateHostInstallTokenOutput> {
  const input = hostAgentTokenInputSchema.parse(payload);
  return deps.port.rotateHostInstallToken(input);
}
