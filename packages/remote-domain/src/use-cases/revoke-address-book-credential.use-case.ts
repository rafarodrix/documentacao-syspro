import { revokeAddressBookCredentialInputSchema, type RevokeAddressBookCredentialOutput } from "../remote-domain.contracts";
import type { RemoteAddressBookPort } from "../remote-domain.port";

export async function revokeAddressBookCredential(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<RevokeAddressBookCredentialOutput> {
  const input = revokeAddressBookCredentialInputSchema.parse(payload);
  return deps.port.revokeAddressBookCredential(input);
}
