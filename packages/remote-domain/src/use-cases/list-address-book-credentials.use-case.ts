import { listAddressBookCredentialsInputSchema, type ListAddressBookCredentialsOutput } from "../remote-domain.contracts";
import type { RemoteAddressBookPort } from "../remote-domain.port";

export async function listAddressBookCredentials(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<ListAddressBookCredentialsOutput> {
  const input = listAddressBookCredentialsInputSchema.parse(payload);
  return deps.port.listAddressBookCredentials(input);
}
