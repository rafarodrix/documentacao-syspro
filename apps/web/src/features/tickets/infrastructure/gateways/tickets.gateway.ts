import { headers } from "next/headers";
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
import { resolveServerOrigin } from "@/lib/server-origin";

async function getAppOriginAndCookie() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") || "";
  const appOrigin = resolveServerOrigin(requestHeaders);
  return { appOrigin, cookie };
}

async function callTicketsApi(path: string, init?: RequestInit): Promise<unknown> {
  const { appOrigin, cookie } = await getAppOriginAndCookie();
  const url = `${appOrigin}/api/tickets${path}`;
  const requestHeaders = new Headers(init?.headers);

  if (cookie && !requestHeaders.has("cookie")) {
    requestHeaders.set("cookie", cookie);
  }

  const response = await fetch(url, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const data = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : null;
    const message =
      (typeof data?.error === "string" && data.error) ||
      (typeof data?.message === "string" && data.message) ||
      `Falha na API de tickets (${response.status}).`;
    throw new Error(message);
  }

  return json;
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
