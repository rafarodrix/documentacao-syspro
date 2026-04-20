import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  releases: "releases",
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
    "/portal/cadastros",
    "/portal/cadastros/empresa",
    "/portal/cadastros/usuarios",
    "/portal/cadastros/sistema",
  ]);
}

export function revalidateContractsViews(includeCadastros = true) {
  revalidatePaths(["/portal/contratos", "/portal/configuracoes"]);

  if (includeCadastros) {
    revalidateCadastrosViews();
  }
}

export function revalidateSettingsViews(includeDashboard = false) {
  if (includeDashboard) {
    revalidatePaths(["/portal", "/portal/configuracoes"]);
    return;
  }

  revalidatePath("/portal/configuracoes");
}

export function revalidateTaxViews() {
  revalidatePaths(["/portal/configuracoes", "/portal/reforma-tributaria"]);
}

export function revalidateDocumentosViews() {
  revalidatePath("/portal/tools/configuracao-documentos");
}

export function revalidateTicketCollections() {
  revalidateTag(CACHE_TAGS.ticketsList);
  revalidateTag(CACHE_TAGS.ticketsDashboard);
  revalidatePath("/portal/tickets");
}

export function revalidateReleasesViews() {
  revalidateTag(CACHE_TAGS.releases);
  revalidatePath("/releases");
  revalidatePath("/releases", "layout");
}

export function revalidateDashboardCollections() {
  revalidateTag(CACHE_TAGS.dashboardMetrics);
  revalidateTag(CACHE_TAGS.dashboardCompanies);
  revalidateTag(CACHE_TAGS.dashboardSefaz);
  revalidateTag(CACHE_TAGS.dashboardActivity);
  revalidatePath("/portal");
}

export function revalidateTicketViews(ticketId?: string | number) {
  if (ticketId !== undefined && ticketId !== null) {
    revalidatePath(`/portal/tickets/${ticketId}`);
  }

  revalidateTicketCollections();
}

