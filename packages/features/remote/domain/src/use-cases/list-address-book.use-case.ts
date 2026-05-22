import { listAddressBookInputSchema, type ListAddressBookOutput } from "../remote-domain.contracts";
import type { RemoteAddressBookPort } from "../remote-domain.port";

export async function listAddressBook(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<ListAddressBookOutput> {
  const input = listAddressBookInputSchema.parse(payload);
  return deps.port.listAddressBook(input);
}
