import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  ticketsList: "tickets-list",
  ticketsDashboard: "tickets-dashboard",
  dashboardMetrics: "dashboard-metrics",
  dashboardCompanies: "dashboard-companies",
  dashboardSefaz: "dashboard-sefaz",
  dashboardActivity: "dashboard-activity",
  settings: "settings",
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

export function revalidateDashboardCollections() {
  revalidateTag(CACHE_TAGS.dashboardMetrics);
  revalidateTag(CACHE_TAGS.dashboardCompanies);
  revalidateTag(CACHE_TAGS.dashboardSefaz);
  revalidateTag(CACHE_TAGS.dashboardActivity);
  revalidatePath("/app");
}

export function revalidateTicketViews(ticketId?: string | number) {
  if (ticketId !== undefined && ticketId !== null) {
    revalidatePath(`/app/chamados/${ticketId}`);
  }

  revalidateTicketCollections();
}
