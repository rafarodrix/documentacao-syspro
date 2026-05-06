import { Building2, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentCompanies } from "@/components/platform/app/dashboard/recent-companies";
import { RecentRecords } from "@/components/platform/app/dashboard/recent-records";
import { cn } from "@/lib/utils";
import { getCadastrosData } from "../../application";

export async function CadastrosTab() {
  const data = await getCadastrosData();
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {canViewCompanies ? (
          <Card className="relative h-full overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
            <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
              <Building2 className="h-20 w-20 -rotate-12 text-blue-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Empresas Ativas</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                {(cadastros?.companies.total ?? companiesCount).toLocaleString("pt-BR")}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                <span className="flex items-center gap-1 font-medium text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> +{cadastros?.companies.registeredThisMonth ?? 0} no mês
                </span>
                <span className="flex items-center gap-1 font-medium text-red-500">
                  <TrendingDown className="h-3 w-3" /> -{cadastros?.companies.inactivatedThisMonth ?? 0} inativ.
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canViewContacts ? (
          <Card className="relative h-full overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
            <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
              <Users className="h-20 w-20 rotate-12 text-orange-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contatos Vinculados</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10">
                <Users className="h-3.5 w-3.5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                {(cadastros?.contacts.total ?? contactsCount).toLocaleString("pt-BR")}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                <span className="flex items-center gap-1 font-medium text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> +{cadastros?.contacts.registeredThisMonth ?? 0} no mês
                </span>
                <span className="flex items-center gap-1 font-medium text-red-500">
                  <TrendingDown className="h-3 w-3" /> -{cadastros?.contacts.inactivatedThisMonth ?? 0} inativ.
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canViewUsers ? (
          <Card className="relative h-full overflow-hidden border-border/50 bg-card/70 transition-all hover:border-border/80 hover:shadow-sm">
            <div className="absolute right-0 top-0 p-3 opacity-[0.04]">
              <Users className="h-20 w-20 rotate-12 text-violet-500" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Usuários Ativos</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-500/10">
                <Users className="h-3.5 w-3.5 text-violet-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                {(cadastros?.users.total ?? usersCount).toLocaleString("pt-BR")}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                <span className="flex items-center gap-1 font-medium text-emerald-500">
                  <TrendingUp className="h-3 w-3" /> +{cadastros?.users.registeredThisMonth ?? 0} no mês
                </span>
                <span className="flex items-center gap-1 font-medium text-red-500">
                  <TrendingDown className="h-3 w-3" /> -{cadastros?.users.inactivatedThisMonth ?? 0} inativ.
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <h3 className="mt-6 text-sm font-medium text-muted-foreground">Últimos Cadastros</h3>
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
            createLabel="Cadastrar contato"
            icon="contact"
            items={recentContacts.map((contact) => ({
              id: contact.id,
              title: contact.name,
              subtitle: contact.email || contact.whatsapp || "Sem canal principal",
              meta: contact.companyNames?.length ? contact.companyNames.join(" • ") : "Sem empresa vinculada",
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
              meta: user.companyNames?.length ? user.companyNames.join(" • ") : user.role,
              createdAt: user.createdAt,
              tags: [user.role],
            }))}
          />
        ) : null}
      </div>

      <h3 className="mt-6 text-sm font-medium text-muted-foreground">Últimas Inativações</h3>
      <div className={cn("grid grid-cols-1 gap-4", colsClass)}>
        {canViewCompanies ? (
          <RecentCompanies companies={cadastros?.recentInactivatedCompanies ?? []} />
        ) : null}
        {canViewContacts ? (
          <RecentRecords
            title="Ultimos contatos inativados"
            description="Contatos arquivados recentemente"
            emptyTitle="Nenhuma inativacao"
            emptyDescription="Contatos inativados aparecerao aqui."
            viewAllHref="/portal/contatos"
            createLabel="Ver contatos"
            icon="contact"
            items={(cadastros?.recentInactivatedContacts ?? []).map((contact) => ({
              id: contact.id,
              title: contact.name,
              subtitle: contact.email || contact.whatsapp || "Sem canal principal",
              meta: contact.companyNames?.length ? contact.companyNames.join(" • ") : "Sem empresa vinculada",
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
            createLabel="Ver usuarios"
            icon="user"
            items={(cadastros?.recentInactivatedUsers ?? []).map((user) => ({
              id: user.id,
              title: user.name,
              subtitle: user.email,
              meta: user.companyNames?.length ? user.companyNames.join(" • ") : user.role,
              createdAt: user.createdAt,
              tags: [user.role],
            }))}
          />
        ) : null}
      </div>
    </div>
  );
}
