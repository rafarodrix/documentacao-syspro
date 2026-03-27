import { relinkHostSysproUpdateInputSchema, type RelinkHostSysproUpdateOutput } from "../contracts";
import type { RemoteHostAdminPort } from "../ports";

export async function relinkHostSysproUpdate(
  payload: unknown,
  deps: { port: RemoteHostAdminPort },
): Promise<RelinkHostSysproUpdateOutput> {
  const input = relinkHostSysproUpdateInputSchema.parse(payload);
  return deps.port.relinkHostSysproUpdate(input);
}
