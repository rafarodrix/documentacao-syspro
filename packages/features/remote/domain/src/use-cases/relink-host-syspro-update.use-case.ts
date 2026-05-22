import { relinkHostSysproUpdateInputSchema, type RelinkHostSysproUpdateOutput } from "../remote-domain.contracts";
import type { RemoteHostAdminPort } from "../remote-domain.port";

export async function relinkHostSysproUpdate(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RelinkHostSysproUpdateOutput> {
  const input = relinkHostSysproUpdateInputSchema.parse(payload);
  return deps.port.relinkHostSysproUpdate(input);
}
