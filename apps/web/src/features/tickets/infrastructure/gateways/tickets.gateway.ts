import type {
  TicketModuleMutationResponse,
} from "@dosc-syspro/contracts/ticket";
import {
  ticketModuleMutationResponseSchema,
} from "@dosc-syspro/contracts/ticket";
import { callWebApi } from "@/lib/web-api";

async function callTicketsApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await callWebApi(`/api/tickets${path}`, init);
  return response.json() as Promise<T>;
}

export async function createTicketMultipartGateway(payload: FormData): Promise<TicketModuleMutationResponse> {
  return ticketModuleMutationResponseSchema.parse(
    await callTicketsApi("", {
      method: "POST",
      body: payload,
    }),
  );
}

export async function replyTicketGateway(
  ticketId: string,
  payload: FormData,
): Promise<TicketModuleMutationResponse> {
  return ticketModuleMutationResponseSchema.parse(
    await callTicketsApi(`/${ticketId}/reply`, {
      method: "POST",
      body: payload,
    }),
  );
}
