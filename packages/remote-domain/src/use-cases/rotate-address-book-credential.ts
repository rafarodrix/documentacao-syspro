import { rotateAddressBookCredentialInputSchema, type RotateAddressBookCredentialOutput } from "../contracts";
import type { RemoteAddressBookPort } from "../ports";

export async function rotateAddressBookCredential(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<RotateAddressBookCredentialOutput> {
  const input = rotateAddressBookCredentialInputSchema.parse(payload);
  return deps.port.rotateAddressBookCredential(input);
}
