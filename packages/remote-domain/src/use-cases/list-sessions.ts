import { listSessionsInputSchema, type ListSessionsOutput } from "../contracts";
import type { RemoteSessionPort } from "../ports";

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