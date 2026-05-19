import { Building2, UserRound, Users } from "lucide-react";
import { RecentCompanies } from "@/components/platform/app/dashboard/recent-companies";
import { RecentRecords } from "@/components/platform/app/dashboard/recent-records";
import { SectionCard } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { DashboardMetricCard } from "../components/dashboard-metric-card";
import { getCadastrosData } from "../../application";

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

  const colsClass = canViewUsers || canViewCompanies || canViewContacts ? "xl:grid-cols-3" : "xl:grid-cols-1";

  return (
    <div className="space-y-5">

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {canViewCompanies ? (
          <DashboardMetricCard
            title="Empresas ativas"
            value={(cadastros?.companies.total ?? companiesCount).toLocaleString("pt-BR")}
            helper={`${cadastros?.companies.registeredThisMonth ?? 0} novas no mes · ${cadastros?.companies.inactivatedThisMonth ?? 0} inativadas`}
            icon={Building2 as any}
            tone="blue"
          />
        ) : null}

        {canViewContacts ? (
          <DashboardMetricCard
            title="Contatos vinculados"
            value={(cadastros?.contacts.total ?? contactsCount).toLocaleString("pt-BR")}
            helper={`${cadastros?.contacts.registeredThisMonth ?? 0} novos no mes · ${cadastros?.contacts.inactivatedThisMonth ?? 0} inativados`}
            icon={Users as any}
            tone="amber"
          />
        ) : null}

        {canViewUsers ? (
          <DashboardMetricCard
            title="Usuarios ativos"
            value={(cadastros?.users.total ?? usersCount).toLocaleString("pt-BR")}
            helper={`${cadastros?.users.registeredThisMonth ?? 0} novos no mes · ${cadastros?.users.inactivatedThisMonth ?? 0} inativados`}
            icon={UserRound as any}
            tone="emerald"
          />
        ) : null}
      </div>

      <div className={cn("grid grid-cols-1 gap-4", colsClass)}>
        {canViewCompanies ? <RecentCompanies companies={companies} /> : null}
        {canViewContacts ? (
          <RecentRecords
            title="Ultimos contatos cadastrados"
            description="Contatos recentes dentro do seu escopo"
            emptyTitle="Nenhum contato cadastrado"
            emptyDescription="Novos contatos aparecerao aqui assim que forem criados."
            viewAllHref="/portal/contatos"
            createHref="/portal/contatos/novo"
            createLabel="Novo contato"
            icon="contact"
            items={recentContacts.map((contact) => ({
              id: contact.id,
              title: contact.name,
              subtitle: contact.email || contact.whatsapp || "Sem canal principal",
              meta: contact.companyNames?.length ? contact.companyNames.join(" · ") : "Sem empresa vinculada",
              createdAt: contact.createdAt,
              tags: contact.companyNames?.slice(0, 2),
            }))}
          />
        ) : null}
        {canViewUsers ? (
          <RecentRecords
            title="Ultimos usuarios cadastrados"
            description="Usuarios recentes dentro do seu escopo"
            emptyTitle="Nenhum usuario cadastrado"
            emptyDescription="Novos usuarios aparecerao aqui assim que forem criados."
            viewAllHref="/portal/cadastros/usuarios"
            createHref="/portal/cadastros/usuarios/novo"
            createLabel="Novo usuario"
            icon="user"
            items={recentUsers.map((user) => ({
              id: user.id,
              title: user.name,
              subtitle: user.email,
              meta: user.companyNames?.length ? user.companyNames.join(" · ") : user.role,
              createdAt: user.createdAt,
              tags: [user.role],
            }))}
          />
        ) : null}
      </div>

      <div className={cn("grid grid-cols-1 gap-4", colsClass)}>
        {canViewCompanies ? <RecentCompanies companies={cadastros?.recentInactivatedCompanies ?? []} /> : null}
        {canViewContacts ? (
          <RecentRecords
            title="Ultimos contatos inativados"
            description="Contatos arquivados recentemente"
            emptyTitle="Nenhuma inativacao"
            emptyDescription="Contatos inativados aparecerao aqui."
            viewAllHref="/portal/contatos"
            createLabel="Abrir contatos"
            icon="contact"
            items={(cadastros?.recentInactivatedContacts ?? []).map((contact) => ({
              id: contact.id,
              title: contact.name,
              subtitle: contact.email || contact.whatsapp || "Sem canal principal",
              meta: contact.companyNames?.length ? contact.companyNames.join(" · ") : "Sem empresa vinculada",
              createdAt: contact.createdAt,
              tags: contact.companyNames?.slice(0, 2),
            }))}
          />
        ) : null}
        {canViewUsers ? (
          <RecentRecords
            title="Ultimos usuarios inativados"
            description="Usuarios inativados recentemente"
            emptyTitle="Nenhuma inativacao"
            emptyDescription="Usuarios inativados aparecerao aqui."
            viewAllHref="/portal/cadastros/usuarios"
            createLabel="Abrir usuarios"
            icon="user"
            items={(cadastros?.recentInactivatedUsers ?? []).map((user) => ({
              id: user.id,
              title: user.name,
              subtitle: user.email,
              meta: user.companyNames?.length ? user.companyNames.join(" · ") : user.role,
              createdAt: user.createdAt,
              tags: [user.role],
            }))}
          />
        ) : null}
      </div>
    </div>
  );
}
