import type {
  TicketModuleCreateRequest,
  TicketModuleDetailsResponse,
  TicketModuleLinkedCompaniesResponse,
  TicketModuleListResponse,
  TicketModuleMutationResponse,
  TicketModuleReplyRequest,
  TicketModuleTriageRequest,
  TicketModuleUpdateRequest,
} from "@dosc-syspro/contracts/ticket";
import {
  ticketModuleDetailsResponseSchema,
  ticketModuleLinkedCompaniesResponseSchema,
  ticketModuleListResponseSchema,
  ticketModuleMutationResponseSchema,
} from "@dosc-syspro/contracts/ticket";
import { callWebApi } from "@/lib/web-api";

async function callTicketsApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await callWebApi(`/api/tickets${path}`, init);
  return response.json() as Promise<T>;
}

export async function fetchTicketsGateway(query: URLSearchParams): Promise<TicketModuleListResponse> {
  return ticketModuleListResponseSchema.parse(await callTicketsApi(`?${query.toString()}`));
}

export async function fetchTicketDetailsGateway(ticketId: string): Promise<TicketModuleDetailsResponse> {
  return ticketModuleDetailsResponseSchema.parse(await callTicketsApi(`/${ticketId}`));
}

export async function fetchTicketDetailsPageGateway(ticketId: string, params?: { page?: number; pageSize?: number }): Promise<TicketModuleDetailsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return ticketModuleDetailsResponseSchema.parse(await callTicketsApi(`/${ticketId}${suffix}`));
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

export async function assignTicketToMeGateway(
  ticketId: string,
): Promise<TicketModuleMutationResponse> {
  return ticketModuleMutationResponseSchema.parse(
    await callTicketsApi(`/${ticketId}/assign-me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );
}

export async function triageTicketGateway(
  ticketId: string,
  payload: TicketModuleTriageRequest,
): Promise<TicketModuleMutationResponse> {
  return ticketModuleMutationResponseSchema.parse(
    await callTicketsApi(`/${ticketId}/triage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}
