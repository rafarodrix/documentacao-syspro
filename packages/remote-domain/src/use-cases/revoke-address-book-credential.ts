import { revokeAddressBookCredentialInputSchema, type RevokeAddressBookCredentialOutput } from "../contracts";
import type { RemoteAddressBookPort } from "../ports";

export async function revokeAddressBookCredential(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<RevokeAddressBookCredentialOutput> {
  const input = revokeAddressBookCredentialInputSchema.parse(payload);
  return deps.port.revokeAddressBookCredential(input);
}
