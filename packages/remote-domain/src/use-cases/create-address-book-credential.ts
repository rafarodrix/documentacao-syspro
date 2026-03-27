import { createAddressBookCredentialInputSchema, type CreateAddressBookCredentialOutput } from "../contracts";
import type { RemoteAddressBookPort } from "../ports";

export async function createAddressBookCredential(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<CreateAddressBookCredentialOutput> {
  const input = createAddressBookCredentialInputSchema.parse(payload);
  return deps.port.createAddressBookCredential(input);
}
