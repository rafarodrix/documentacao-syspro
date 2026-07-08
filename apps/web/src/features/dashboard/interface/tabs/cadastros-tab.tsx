import { formatNumber } from "@/lib/formatters";
import { RecentCompanies } from "@/components/platform/app/dashboard/recent-companies";
import { RecentRecords } from "@/components/platform/app/dashboard/recent-records";
import { SectionCard } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
import { getCadastrosData } from "../../application/cadastros-dashboard.queries";

export async function CadastrosTab() {
  let data: Awaited<ReturnType<typeof getCadastrosData>>;

  try {
    data = await getCadastrosData();
  } catch {
    return (
      <SectionCard
        title="Cadastros indisponiveis"
        className="border-border/50 bg-card"
      >
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

  // Filter list items based on executive block logic
  const activeCompanies = companies.filter((c) => c.status === "ACTIVE");
  const inactiveCompanies = cadastros?.recentInactivatedCompanies ?? [];
  const reviewCompanies = companies.filter(
    (c) => c.status === "PENDING_DOCS" || c.status === "SUSPENDED"
  );

  const inactiveContacts = cadastros?.recentInactivatedContacts ?? [];
  const unlinkedContacts = recentContacts.filter((c) => !c.companyNames?.length);

  const inactiveUsers = cadastros?.recentInactivatedUsers ?? [];
  const unlinkedUsers = recentUsers.filter(
    (u) => !u.companyNames?.length && u.role !== "DEVELOPER" && u.role !== "ADMIN"
  );

  // Format list items for display
  const formattedRecentContacts = recentContacts.map((contact) => ({
    id: contact.id,
    title: contact.name,
    subtitle: contact.email || contact.whatsapp || "Sem canal principal",
    meta: contact.companyNames?.length ? contact.companyNames.join(" · ") : "Sem empresa vinculada",
    createdAt: contact.createdAt,
    tags: contact.companyNames?.slice(0, 2),
  }));

  const formattedRecentUsers = recentUsers.map((user) => ({
    id: user.id,
    title: user.name,
    subtitle: user.email,
    meta: user.companyNames?.length ? user.companyNames.join(" · ") : user.role,
    createdAt: user.createdAt,
    tags: [user.role],
  }));

  const formattedInactiveContacts = inactiveContacts.map((contact) => ({
    id: contact.id,
    title: contact.name,
    subtitle: contact.email || contact.whatsapp || "Sem canal principal",
    meta: contact.companyNames?.length ? contact.companyNames.join(" · ") : "Sem empresa vinculada",
    createdAt: contact.createdAt,
    tags: contact.companyNames?.slice(0, 2),
  }));

  const formattedInactiveUsers = inactiveUsers.map((user) => ({
    id: user.id,
    title: user.name,
    subtitle: user.email,
    meta: user.companyNames?.length ? user.companyNames.join(" · ") : user.role,
    createdAt: user.createdAt,
    tags: [user.role],
  }));

  const formattedUnlinkedContacts = unlinkedContacts.map((contact) => ({
    id: contact.id,
    title: contact.name,
    subtitle: contact.email || contact.whatsapp || "Sem canal principal",
    meta: "Falta vincular empresa",
    createdAt: contact.createdAt,
    tags: ["Revisar"],
  }));

  const formattedUnlinkedUsers = unlinkedUsers.map((user) => ({
    id: user.id,
    title: user.name,
    subtitle: user.email,
    meta: "Falta vincular empresa",
    createdAt: user.createdAt,
    tags: ["Revisar"],
  }));

  const colsClass = canViewUsers || canViewCompanies || canViewContacts ? "xl:grid-cols-3" : "xl:grid-cols-1";

  return (
    <div className="space-y-6">
      {/* Top metrics summary */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {canViewCompanies ? (
          <DashboardMetricCard
            title="Empresas ativas"
            value={formatNumber(cadastros?.companies.total ?? companiesCount)}
            helper={`${cadastros?.companies.registeredThisMonth ?? 0} novas no mes · ${cadastros?.companies.inactivatedThisMonth ?? 0} inativadas`}
            icon="building"
            tone="blue"
          />
        ) : null}

        {canViewContacts ? (
          <DashboardMetricCard
            title="Contatos vinculados"
            value={formatNumber(cadastros?.contacts.total ?? contactsCount)}
            helper={`${cadastros?.contacts.registeredThisMonth ?? 0} novos no mes · ${cadastros?.contacts.inactivatedThisMonth ?? 0} inativados`}
            icon="users"
            tone="amber"
          />
        ) : null}

        {canViewUsers ? (
          <DashboardMetricCard
            title="Usuarios ativos"
            value={formatNumber(cadastros?.users.total ?? usersCount)}
            helper={`${cadastros?.users.registeredThisMonth ?? 0} novos no mes · ${cadastros?.users.inactivatedThisMonth ?? 0} inativados`}
            icon="user"
            tone="emerald"
          />
        ) : null}
      </div>

      {/* Main Executive Blocks Grid */}
      <div className={cn("grid grid-cols-1 gap-6", colsClass)}>
        
        {/* Column 1: Novos no Mês */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider px-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Novos no Mês
          </h3>
          {canViewCompanies ? (
            <RecentCompanies
              title="Empresas Ativas"
              companies={activeCompanies}
              emptyTitle="Nenhuma empresa ativa"
              emptyDescription="Novas empresas ativas aparecerão aqui no mês."
            />
          ) : null}
          {canViewContacts ? (
            <RecentRecords
              title="Novos Contatos"
              description="Contatos criados recentemente"
              emptyTitle="Nenhum novo contato"
              emptyDescription="Novos contatos vinculados aparecerão aqui."
              viewAllHref="/portal/contatos"
              createHref="/portal/contatos/novo"
              createLabel="Novo contato"
              icon="contact"
              items={formattedRecentContacts}
            />
          ) : null}
          {canViewUsers ? (
            <RecentRecords
              title="Novos Usuários"
              description="Usuários cadastrados recentemente"
              emptyTitle="Nenhum novo usuário"
              emptyDescription="Novos usuários cadastrados aparecerão aqui."
              viewAllHref="/portal/cadastros/usuarios"
              createHref="/portal/cadastros/usuarios/novo"
              createLabel="Novo usuário"
              icon="user"
              items={formattedRecentUsers}
            />
          ) : null}
        </div>

        {/* Column 2: Inativados Recentes */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider px-1">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
            Inativados Recentes
          </h3>
          {canViewCompanies ? (
            <RecentCompanies
              title="Empresas Inativas"
              companies={inactiveCompanies}
              emptyTitle="Nenhuma empresa inativa"
              emptyDescription="Nenhuma inativação de empresa registrada recentemente."
              createHref="/portal/cadastros/empresa/novo"
            />
          ) : null}
          {canViewContacts ? (
            <RecentRecords
              title="Contatos Inativos"
              description="Contatos arquivados recentemente"
              emptyTitle="Nenhum contato inativo"
              emptyDescription="Nenhuma inativação de contato registrada recentemente."
              viewAllHref="/portal/contatos"
              icon="contact"
              items={formattedInactiveContacts}
            />
          ) : null}
          {canViewUsers ? (
            <RecentRecords
              title="Usuários Inativos"
              description="Usuários desativados recentemente"
              emptyTitle="Nenhum usuário inativo"
              emptyDescription="Nenhuma inativação de usuário registrada recentemente."
              viewAllHref="/portal/cadastros/usuarios"
              icon="user"
              items={formattedInactiveUsers}
            />
          ) : null}
        </div>

        {/* Column 3: Precisam de Revisão */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider px-1">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            Precisam de Revisão
          </h3>
          {canViewCompanies ? (
            <RecentCompanies
              title="Atenção: Empresas"
              companies={reviewCompanies}
              emptyTitle="Empresas em dia!"
              emptyDescription="Nenhuma empresa pendente de documentos ou suspensa."
              createHref="/portal/cadastros/empresa/novo"
            />
          ) : null}
          {canViewContacts ? (
            <RecentRecords
              title="Contatos sem Vínculo"
              description="Contatos órfãos de empresa"
              emptyTitle="Nenhum contato órfão"
              emptyDescription="Todos os contatos recentes possuem empresa vinculada."
              viewAllHref="/portal/contatos"
              icon="contact"
              items={formattedUnlinkedContacts}
            />
          ) : null}
          {canViewUsers ? (
            <RecentRecords
              title="Usuários sem Vínculo"
              description="Usuários de cliente sem empresa"
              emptyTitle="Nenhum usuário órfão"
              emptyDescription="Todos os usuários de clientes estão vinculados a empresas."
              viewAllHref="/portal/cadastros/usuarios"
              icon="user"
              items={formattedUnlinkedUsers}
            />
          ) : null}
        </div>

      </div>
    </div>
  );
}
