import { listSessionsInputSchema, type ListSessionsOutput } from "../remote-domain.contracts";
import type { RemoteSessionPort } from "../remote-domain.port";

export async function listSessions(
  payload: unknown,
  deps: {
    port: RemoteSessionPort;
  },
): Promise<ListSessionsOutput> {
  const input = listSessionsInputSchema.parse(payload);
  const sessions = await deps.port.listSessions(input.scope);

  return {
    sessions,
  };
}