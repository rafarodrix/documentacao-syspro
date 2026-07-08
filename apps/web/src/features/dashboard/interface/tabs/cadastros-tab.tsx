import { formatNumber } from "@/lib/formatters";
import { RecentCompanies } from "@/components/platform/app/dashboard/recent-companies";
import { RecentRecords, type RecentRecordItem } from "@/components/platform/app/dashboard/recent-records";
import { SectionCard } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { DashboardMetricGrid } from "../components/dashboard-metric-grid";
import { ExecutiveSummaryCard } from "../components/executive-summary-card";
import { ExecutiveLine } from "../components/executive-line";
import { DashboardNextActionCard } from "../components/dashboard-next-action-card";
import { RegistryTimelineColumn } from "../components/registry-timeline-column";
import { getCadastrosData } from "../../application/cadastros-dashboard.queries";

type ContactLike = {
  id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
  companyNames?: string[] | null;
  createdAt: Date | string | null;
};

type UserLike = {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  companyNames?: string[] | null;
  createdAt: Date | string | null;
};

function joinMeta(values: Array<string | null | undefined>, fallback: string) {
  const visibleValues = values.filter((value): value is string => Boolean(value?.trim()));
  return visibleValues.length > 0 ? visibleValues.join(" | ") : fallback;
}

function mapContactRecord(
  contact: ContactLike,
  overrides?: Partial<Pick<RecentRecordItem, "meta" | "tags">>,
): RecentRecordItem {
  return {
    id: contact.id,
    title: contact.name,
    subtitle: contact.email || contact.whatsapp || "Sem canal principal",
    meta: overrides?.meta ?? joinMeta(contact.companyNames ?? [], "Sem empresa vinculada"),
    createdAt: contact.createdAt,
    tags: overrides?.tags ?? contact.companyNames?.slice(0, 2),
  };
}

function mapUserRecord(
  user: UserLike,
  overrides?: Partial<Pick<RecentRecordItem, "meta" | "tags">>,
): RecentRecordItem {
  return {
    id: user.id,
    title: user.name,
    subtitle: user.email || "Sem email principal",
    meta: overrides?.meta ?? joinMeta(user.companyNames ?? [], user.role),
    createdAt: user.createdAt,
    tags: overrides?.tags ?? [user.role],
  };
}

export async function CadastrosTab() {
  let data: Awaited<ReturnType<typeof getCadastrosData>>;

  try {
    data = await getCadastrosData();
  } catch {
    return (
      <SectionCard title="Cadastros indisponiveis" className="border-border/50 bg-card">
        <p className="text-sm text-muted-foreground">
          Revise as permissoes de empresas, contatos e usuarios para este perfil e tente novamente.
        </p>
      </SectionCard>
    );
  }

  const {
    canViewCompanies,
    canViewContacts,
    canViewUsers,
    companies,
    recentContacts,
    recentUsers,
    cadastros,
    companiesCount,
    contactsCount,
    usersCount,
  } = data;

  const activeCompanies = companies.filter((company) => company.status === "ACTIVE");
  const inactiveCompanies = cadastros?.recentInactivatedCompanies ?? [];
  const reviewCompanies = companies.filter(
    (company) => company.status === "PENDING_DOCS" || company.status === "SUSPENDED",
  );
  const inactiveContacts = cadastros?.recentInactivatedContacts ?? [];
  const unlinkedContacts = recentContacts.filter((contact) => !contact.companyNames?.length);
  const inactiveUsers = cadastros?.recentInactivatedUsers ?? [];
  const unlinkedUsers = recentUsers.filter(
    (user) => !user.companyNames?.length && user.role !== "DEVELOPER" && user.role !== "ADMIN",
  );
  const reviewCount = reviewCompanies.length + unlinkedContacts.length + unlinkedUsers.length;

  const formattedRecentContacts = recentContacts.map((contact) => mapContactRecord(contact));
  const formattedRecentUsers = recentUsers.map((user) => mapUserRecord(user));
  const formattedInactiveContacts = inactiveContacts.map((contact) => mapContactRecord(contact));
  const formattedInactiveUsers = inactiveUsers.map((user) => mapUserRecord(user));
  const formattedUnlinkedContacts = unlinkedContacts.map((contact) =>
    mapContactRecord(contact, { meta: "Falta vincular empresa", tags: ["Revisar"] }),
  );
  const formattedUnlinkedUsers = unlinkedUsers.map((user) =>
    mapUserRecord(user, { meta: "Falta vincular empresa", tags: ["Revisar"] }),
  );

  const colsClass = canViewUsers || canViewCompanies || canViewContacts ? "xl:grid-cols-3" : "xl:grid-cols-1";

  return (
    <div className="space-y-5">
      <ExecutiveSummaryCard
        title="Leitura executiva dos cadastros"
        description="Use esta leitura para manter a base ativa, corrigir vinculos quebrados e impedir que pendencias de cadastro contaminem suporte, comercial e operacao."
      >
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <ExecutiveLine
            label="Empresas sob revisao"
            value={`${reviewCompanies.length}`}
            emphasis={reviewCompanies.length > 0 ? "font-bold text-rose-500" : "text-foreground"}
          />
          <ExecutiveLine
            label="Contatos sem vinculo"
            value={`${unlinkedContacts.length}`}
            emphasis={unlinkedContacts.length > 0 ? "font-bold text-amber-500" : "text-foreground"}
          />
          <ExecutiveLine
            label="Itens para saneamento"
            value={`${reviewCount}`}
            emphasis={reviewCount > 0 ? "font-bold text-amber-500" : "text-foreground"}
          />
        </div>
      </ExecutiveSummaryCard>

      <DashboardMetricGrid
        className="md:grid-cols-3 xl:grid-cols-3"
        metrics={[
          ...(canViewCompanies
            ? [{
                title: "Empresas ativas",
                value: formatNumber(cadastros?.companies.total ?? companiesCount),
                helper: `${cadastros?.companies.registeredThisMonth ?? 0} novas no mes | ${cadastros?.companies.inactivatedThisMonth ?? 0} inativadas`,
                icon: "building" as const,
                tone: "blue" as const,
              }]
            : []),
          ...(canViewContacts
            ? [{
                title: "Contatos vinculados",
                value: formatNumber(cadastros?.contacts.total ?? contactsCount),
                helper: `${cadastros?.contacts.registeredThisMonth ?? 0} novos no mes | ${cadastros?.contacts.inactivatedThisMonth ?? 0} inativados`,
                icon: "users" as const,
                tone: "amber" as const,
              }]
            : []),
          ...(canViewUsers
            ? [{
                title: "Usuarios ativos",
                value: formatNumber(cadastros?.users.total ?? usersCount),
                helper: `${cadastros?.users.registeredThisMonth ?? 0} novos no mes | ${cadastros?.users.inactivatedThisMonth ?? 0} inativados`,
                icon: "user" as const,
                tone: "emerald" as const,
              }]
            : []),
        ]}
      />

      <div className={cn("grid grid-cols-1 gap-6", colsClass)}>
        <RegistryTimelineColumn title="Novos no mes" accentClassName="h-2 w-2 rounded-full bg-emerald-500">
          {canViewCompanies ? (
            <RecentCompanies
              title="Empresas ativas"
              companies={activeCompanies}
              emptyTitle="Nenhuma empresa ativa"
              emptyDescription="Novas empresas ativas aparecerao aqui no mes."
            />
          ) : null}
          {canViewContacts ? (
            <RecentRecords
              title="Novos contatos"
              description="Contatos criados recentemente"
              emptyTitle="Nenhum novo contato"
              emptyDescription="Novos contatos vinculados aparecerao aqui."
              viewAllHref="/portal/contatos"
              createHref="/portal/contatos/novo"
              createLabel="Novo contato"
              icon="contact"
              items={formattedRecentContacts}
            />
          ) : null}
          {canViewUsers ? (
            <RecentRecords
              title="Novos usuarios"
              description="Usuarios cadastrados recentemente"
              emptyTitle="Nenhum novo usuario"
              emptyDescription="Novos usuarios cadastrados aparecerao aqui."
              viewAllHref="/portal/cadastros/usuarios"
              createHref="/portal/cadastros/usuarios/novo"
              createLabel="Novo usuario"
              icon="user"
              items={formattedRecentUsers}
            />
          ) : null}
        </RegistryTimelineColumn>

        <RegistryTimelineColumn title="Inativados recentes" accentClassName="h-2 w-2 rounded-full bg-muted-foreground/60">
          {canViewCompanies ? (
            <RecentCompanies
              title="Empresas inativas"
              companies={inactiveCompanies}
              emptyTitle="Nenhuma empresa inativa"
              emptyDescription="Nenhuma inativacao de empresa registrada recentemente."
              createHref="/portal/cadastros/empresa/novo"
            />
          ) : null}
          {canViewContacts ? (
            <RecentRecords
              title="Contatos inativos"
              description="Contatos arquivados recentemente"
              emptyTitle="Nenhum contato inativo"
              emptyDescription="Nenhuma inativacao de contato registrada recentemente."
              viewAllHref="/portal/contatos"
              icon="contact"
              items={formattedInactiveContacts}
            />
          ) : null}
          {canViewUsers ? (
            <RecentRecords
              title="Usuarios inativos"
              description="Usuarios desativados recentemente"
              emptyTitle="Nenhum usuario inativo"
              emptyDescription="Nenhuma inativacao de usuario registrada recentemente."
              viewAllHref="/portal/cadastros/usuarios"
              icon="user"
              items={formattedInactiveUsers}
            />
          ) : null}
        </RegistryTimelineColumn>

        <RegistryTimelineColumn title="Precisam de revisao" accentClassName="h-2 w-2 rounded-full animate-pulse bg-rose-500">
          {canViewCompanies ? (
            <RecentCompanies
              title="Atencao: empresas"
              companies={reviewCompanies}
              emptyTitle="Empresas em dia!"
              emptyDescription="Nenhuma empresa pendente de documentos ou suspensa."
              createHref="/portal/cadastros/empresa/novo"
            />
          ) : null}
          {canViewContacts ? (
            <RecentRecords
              title="Contatos sem vinculo"
              description="Contatos sem empresa vinculada"
              emptyTitle="Nenhum contato sem vinculo"
              emptyDescription="Todos os contatos recentes possuem empresa vinculada."
              viewAllHref="/portal/contatos"
              icon="contact"
              items={formattedUnlinkedContacts}
            />
          ) : null}
          {canViewUsers ? (
            <RecentRecords
              title="Usuarios sem vinculo"
              description="Usuarios de cliente sem empresa"
              emptyTitle="Nenhum usuario sem vinculo"
              emptyDescription="Todos os usuarios de clientes estao vinculados a empresas."
              viewAllHref="/portal/cadastros/usuarios"
              icon="user"
              items={formattedUnlinkedUsers}
            />
          ) : null}
        </RegistryTimelineColumn>
      </div>

      <DashboardNextActionCard
        description="Feche a leitura saneando pendencias de cadastro na lista principal e abra nova empresa apenas quando a base estiver sob controle."
        primaryHref="/portal/cadastros/empresa"
        primaryLabel="Ir para empresas"
        secondaryHref="/portal/cadastros/empresa/novo"
        secondaryLabel="Cadastrar nova empresa"
      />
    </div>
  );
}
