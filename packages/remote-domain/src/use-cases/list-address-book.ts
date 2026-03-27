import { listAddressBookInputSchema, type ListAddressBookOutput } from "../contracts";
import type { RemoteAddressBookPort } from "../ports";

export async function listAddressBook(
  payload: unknown,
  deps: { port: RemoteAddressBookPort },
): Promise<ListAddressBookOutput> {
  const input = listAddressBookInputSchema.parse(payload);
  return deps.port.listAddressBook(input);
}
