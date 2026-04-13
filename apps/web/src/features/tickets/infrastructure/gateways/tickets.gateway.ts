import type {
  TicketModuleCreateRequest,
  TicketModuleDetailsResponse,
  TicketModuleLinkedCompaniesResponse,
  TicketModuleListResponse,
  TicketModuleMutationResponse,
  TicketModuleReplyRequest,
  TicketModuleUpdateRequest,
} from "@dosc-syspro/contracts";
import {
  ticketModuleDetailsResponseSchema,
  ticketModuleLinkedCompaniesResponseSchema,
  ticketModuleListResponseSchema,
  ticketModuleMutationResponseSchema,
} from "@dosc-syspro/contracts";
import { callBackendApi } from "@/lib/backend-api-client";

async function callTicketsApi<T>(path: string, init?: RequestInit): Promise<T> {
  return callBackendApi<T>("tickets", path, init);
}

export async function fetchTicketsGateway(query: URLSearchParams): Promise<TicketModuleListResponse> {
  return ticketModuleListResponseSchema.parse(await callTicketsApi(`?${query.toString()}`));
}

export async function fetchTicketDetailsGateway(ticketId: string): Promise<TicketModuleDetailsResponse> {
  return ticketModuleDetailsResponseSchema.parse(await callTicketsApi(`/${ticketId}`));
}

export async function createTicketGateway(payload: TicketModuleCreateRequest): Promise<TicketModuleMutationResponse> {
  return ticketModuleMutationResponseSchema.parse(
    await callTicketsApi("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function replyTicketGateway(
  ticketId: string,
  payload: TicketModuleReplyRequest,
): Promise<TicketModuleMutationResponse> {
  return ticketModuleMutationResponseSchema.parse(
    await callTicketsApi(`/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateTicketGateway(
  ticketId: string,
  payload: TicketModuleUpdateRequest,
): Promise<TicketModuleMutationResponse> {
  return ticketModuleMutationResponseSchema.parse(
    await callTicketsApi(`/${ticketId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchLinkedCompaniesGateway(): Promise<TicketModuleLinkedCompaniesResponse> {
  return ticketModuleLinkedCompaniesResponseSchema.parse(await callTicketsApi("/linked-companies"));
}
