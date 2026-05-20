import type { NextRequest } from "next/server";
import {
  proxyToBackend,
  resolveCatchAllBackendPath,
  type CatchAllRouteContext,
} from "@/app/api/_shared/backend-proxy";

// Operações que usam tRPC (frontend chama /api/trpc diretamente):
//   - list tickets              → trpc.tickets.list
//   - ticket details            → trpc.tickets.details
//   - linked companies          → trpc.tickets.linkedCompanies
//   - customer email options    → trpc.tickets.customerEmails
//   - archive / update / triage → trpc.tickets.*
//
// Operações que ainda precisam de REST (multipart/binary):
//   POST /api/tickets                           → criar ticket com anexos
//   POST /api/tickets/:id/reply                 → responder com anexos
//   GET  /api/tickets/:id/attachments/:attachmentId → download de anexo

export async function GET(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tickets");
  return proxyToBackend(request, { path });
}

export async function POST(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tickets");
  return proxyToBackend(request, { path });
}

export async function PATCH(request: NextRequest, context: CatchAllRouteContext) {
  const path = await resolveCatchAllBackendPath(context, "/tickets");
  return proxyToBackend(request, { path });
}
