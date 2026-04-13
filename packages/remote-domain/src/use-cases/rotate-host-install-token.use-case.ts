import { hostAgentTokenInputSchema, type RotateHostInstallTokenOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function rotateHostInstallToken(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RotateHostInstallTokenOutput> {
  const input = hostAgentTokenInputSchema.parse(payload);
  return deps.port.rotateHostInstallToken(input);
}
