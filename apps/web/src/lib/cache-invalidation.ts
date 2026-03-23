import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  ticketsList: "tickets-list",
  ticketsDashboard: "tickets-dashboard",
} as const;

function revalidatePaths(paths: readonly string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export function revalidateCadastrosViews() {
  revalidatePaths([
    "/app/cadastros",
    "/app/cadastros/empresa",
    "/app/cadastros/usuarios",
    "/app/cadastros/sistema",
  ]);
}

export function revalidateContractsViews(includeCadastros = true) {
  revalidatePaths(["/app/contratos", "/app/configuracoes"]);

  if (includeCadastros) {
    revalidateCadastrosViews();
  }
}

export function revalidateSettingsViews(includeDashboard = false) {
  if (includeDashboard) {
    revalidatePaths(["/app", "/app/configuracoes"]);
    return;
  }

  revalidatePath("/app/configuracoes");
}

export function revalidateTaxViews() {
  revalidatePaths(["/app/configuracoes", "/app/reforma-tributaria"]);
}

export function revalidateDocumentosViews() {
  revalidatePath("/app/tools/configuracao-documentos");
}

export function revalidateTicketCollections() {
  revalidateTag(CACHE_TAGS.ticketsList);
  revalidateTag(CACHE_TAGS.ticketsDashboard);
  revalidatePath("/app/chamados");
}

export function revalidateTicketViews(ticketId?: string | number) {
  if (ticketId !== undefined && ticketId !== null) {
    revalidatePath(`/app/chamados/${ticketId}`);
  }

  revalidateTicketCollections();
}
