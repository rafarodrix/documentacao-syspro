import { rotateAddressBookCredentialInputSchema, type RotateAddressBookCredentialOutput } from "../remote-domain.contracts";
import type { RemoteAddressBookPort } from "../remote-domain.port";

export async function rotateAddressBookCredential(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<RotateAddressBookCredentialOutput> {
  const input = rotateAddressBookCredentialInputSchema.parse(payload);
  return deps.port.rotateAddressBookCredential(input);
}
