import { requireSession } from "@/lib/auth-helpers";
import { getCompanyCockpitFallbackViewData, getCompanyCockpitViewData, getCompanyEditViewData } from "@/features/company/application/company-read.queries";
import { CompanyCockpitPage } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { currentUserCanAccessCompany } from "@/features/user-access/application/current-user-access";
import type { CompanyCockpitViewData } from "@dosc-syspro/contracts/company";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function buildEmergencyCompanyCockpitView(companyId: string): Promise<CompanyCockpitViewData> {
  const editView = await getCompanyEditViewData(companyId).catch(() => null);
  const initialData = editView?.initialData;

  return {
    profile: {
      companyId,
      displayName: initialData?.nomeFantasia?.trim() || initialData?.razaoSocial?.trim() || `Empresa ${companyId}`,
      razaoSocial: initialData?.razaoSocial?.trim() || "Empresa",
      nomeFantasia: initialData?.nomeFantasia?.trim() || null,
      cnpj: initialData?.cnpj?.trim() || "",
      status: initialData?.status ?? "ACTIVE",
      segment: initialData?.segment ?? null,
      regimeTributario: initialData?.regimeTributario ?? null,
      city: initialData?.address?.cidade?.trim() || null,
      state: initialData?.address?.estado?.trim() || null,
      accountingFirmName: null,
      blockedReasonLabel: null,
      installationDirectory: initialData?.installationDirectory?.trim() || null,
      serverHost: initialData?.serverHost?.trim() || null,
      serverType: initialData?.serverType ?? null,
      serverProtocol: initialData?.serverProtocol ?? null,
      serverPort: initialData?.serverPort ?? null,
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
      score: 50,
      status: "WATCH",
      label: "Visao emergencial",
      summary: "O cockpit nao conseguiu carregar dados do backend nesta sessao. A pagina foi mantida aberta com contexto minimo da empresa.",
    },
    alerts: [
      {
        id: "emergency-fallback",
        severity: "WARNING",
        title: "Cockpit carregado em modo emergencial",
        description: "A consolidacao completa falhou. Revise a empresa, atualize a pagina ou valide os logs do backend para este companyId.",
        href: `/portal/cadastros/empresa/${companyId}/editar`,
        ctaLabel: "Abrir cadastro",
      },
    ],
    recommendedActions: [
      {
        id: "emergency-open-edit",
        tone: "warning",
        title: "Validar cadastro base da empresa",
        description: "Como o cockpit nao consolidou os blocos operacionais, comece pela ficha cadastral e pelos modulos relacionados.",
        href: `/portal/cadastros/empresa/${companyId}/editar`,
        ctaLabel: "Abrir empresa",
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
    return getCompanyCockpitFallbackViewData(id).catch(async (fallbackError) => {
      console.error("[company-360] Falha ao carregar fallback parcial. Usando visao emergencial local.", {
        companyId: id,
        error: fallbackError,
      });
      return buildEmergencyCompanyCockpitView(id);
    });
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
