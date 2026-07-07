import { requireSession } from "@/lib/auth-helpers";
import { getCompanyCockpitViewData, getCompanyEditViewData } from "@/features/company/application/company-read.queries";
import { CompanyCockpitPage } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { currentUserCanAccessCompany } from "@/features/user-access/application/current-user-access";
import type { CompanyCockpitViewData, CompanyEditViewData } from "@dosc-syspro/contracts/company";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildFallbackCockpitView(view: CompanyEditViewData): CompanyCockpitViewData {
  const city = view.initialData.address?.cidade?.trim() || null;
  const state = view.initialData.address?.estado?.trim() || null;

  return {
    profile: {
      companyId: view.companyId,
      displayName: view.initialData.nomeFantasia?.trim() || view.initialData.razaoSocial,
      razaoSocial: view.initialData.razaoSocial,
      nomeFantasia: view.initialData.nomeFantasia?.trim() || null,
      cnpj: view.initialData.cnpj,
      status: view.initialData.status,
      segment: view.initialData.segment ?? null,
      regimeTributario: view.initialData.regimeTributario ?? null,
      city,
      state,
      accountingFirmName: null,
      blockedReasonLabel: null,
      installationDirectory: view.initialData.installationDirectory?.trim() || null,
      serverHost: view.initialData.serverHost?.trim() || null,
      serverType: view.initialData.serverType ?? null,
      serverProtocol: view.initialData.serverProtocol ?? null,
      serverPort: view.initialData.serverPort ?? null,
      counts: {
        users: 0,
        contacts: 0,
        contracts: 0,
        remoteHosts: 0,
        integrationConnections: 0,
        conversationLinks: 0,
        openTickets: 0,
        openTasks: 0,
      },
    },
    sla: {
      openTickets: 0,
      responseOverdue: 0,
      resolutionOverdue: 0,
      responseDueSoon: 0,
      resolutionDueSoon: 0,
    },
    health: {
      score: 70,
      status: "WATCH",
      label: "Visao parcial",
      summary: "O cockpit completo nao conseguiu consolidar todos os blocos desta empresa. A base cadastral segue disponivel.",
    },
    alerts: [
      {
        id: "partial-cockpit",
        severity: "WARNING",
        title: "Cockpit carregado em modo parcial",
        description: "Alguns blocos operacionais nao puderam ser consolidados agora. Use os atalhos da conta enquanto o diagnostico e concluido.",
        href: null,
        ctaLabel: null,
      },
    ],
    recommendedActions: [
      {
        id: "open-edit-company",
        tone: "warning",
        title: "Revisar dados base da empresa",
        description: "Enquanto o cockpit completo nao consolida todos os blocos, use o cadastro da empresa como ponto de partida.",
        href: `/portal/cadastros/empresa/${view.companyId}/editar`,
        ctaLabel: "Abrir cadastro",
      },
    ],
    tickets: [],
    tasks: [],
    monthlyRoutine: {
      isConfigured: false,
      isActive: false,
      title: null,
      dueDay: null,
      reminderDays: null,
      pendingCount: 0,
      overdueCount: 0,
      waitingCustomerCount: 0,
      completedCount: 0,
      latestItems: [],
    },
    conversations: [],
    hosts: [],
    sessions: [],
    integrations: [],
    releases: [],
  };
}

export default async function CompanyCockpitRoute({ params, searchParams }: PageProps) {
  await requireSession();
  const { id } = await params;
  if (!(await currentUserCanAccessCompany(id, "companies:view_cockpit", "companies:view_all"))) {
    return <CadastrosAccessDenied />;
  }
  const canEditCompany = await currentUserCanAccessCompany(id, "companies:edit", "companies:view_all");
  const query = searchParams ? await searchParams : undefined;
  const returnToParam = query?.returnTo;
  const backHref =
    typeof returnToParam === "string"
      ? returnToParam
      : Array.isArray(returnToParam)
        ? returnToParam[0] ?? "/portal/cadastros/empresa"
        : "/portal/cadastros/empresa";

  const view = await getCompanyCockpitViewData(id).catch(async (error) => {
    console.error("[company-360] Falha ao carregar cockpit completo. Tentando fallback parcial.", { companyId: id, error });
    const editView = await getCompanyEditViewData(id);
    return buildFallbackCockpitView(editView);
  });

  return (
    <CompanyCockpitPage
      view={view}
      backHref={backHref}
      canEdit={canEditCompany}
      editHref={`/portal/cadastros/empresa/${id}/editar?returnTo=${encodeURIComponent(backHref)}`}
    />
  );
}
