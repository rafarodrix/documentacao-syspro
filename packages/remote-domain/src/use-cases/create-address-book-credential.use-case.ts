import { createAddressBookCredentialInputSchema, type CreateAddressBookCredentialOutput } from "../remote-domain.contracts";
import type { RemoteAddressBookPort } from "../remote-domain.port";

export async function createAddressBookCredential(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<CreateAddressBookCredentialOutput> {
  const input = createAddressBookCredentialInputSchema.parse(payload);
  return deps.port.createAddressBookCredential(input);
}
