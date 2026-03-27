import { listAddressBookCredentialsInputSchema, type ListAddressBookCredentialsOutput } from "../contracts";
import type { RemoteAddressBookPort } from "../ports";

export async function listAddressBookCredentials(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<ListAddressBookCredentialsOutput> {
  const input = listAddressBookCredentialsInputSchema.parse(payload);
  return deps.port.listAddressBookCredentials(input);
}
