"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, Headphones, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import {
  CompanyOperationalSettingsCard,
  DetailItem,
  EmptyState,
  GuidedStep,
  InlineLoading,
  InlineNotice,
  InlineWarning,
  QuickStatCard,
  getCompanyLabel,
} from "../chatwoot-dashboard-ui";

export function ChatwootOverviewTab() {
  const {
    resolved,
    companyHosts,
    latestTickets,
    linkedCompanies,
    priorityTicket,
    recommendedHost,
    primaryCompany,
    orderedLinkedCompanies,
    canCreateTicket,
    effectiveContactName,
    contactEditHref,
    // Contact binding
    portalContactMatch,
    isLoadingPortalContact,
    contactLookupError,
    contactNameDraft,
    isSavingContactName,
    companySearchTerm,
    filteredCompanyOptions,
    shouldSearchCompanies,
    isLoadingCompanyOptions,
    companyOptionsError,
    selectedCompanyId,
    selectedCompanyOption,
    isBindingCompany,
    companyBindingFeedback,
    setContactNameDraft,
    setCompanySearchTerm,
    setSelectedCompanyId,
    setCompanyBindingFeedback,
    handleCopySummary,
    handleBindCompany,
    handleSaveContactName,
  } = useChatwootDashboard();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <QuickStatCard
          label="Hosts"
          value={String(companyHosts.length)}
          helper={recommendedHost?.name || "Sem host recomendado"}
        />
        <QuickStatCard
          label="Tickets"
          value={String(latestTickets.length)}
          helper={priorityTicket ? `Principal: #${priorityTicket.number}` : "Nenhum ticket em contexto"}
        />
        <QuickStatCard
          label="Vinculo"
          value={resolved.companyId ? "Ativo" : "Pendente"}
          helper={
            resolved.companyId
              ? `${linkedCompanies.length} empresa${linkedCompanies.length === 1 ? "" : "s"} ligada${linkedCompanies.length === 1 ? "" : "s"}`
              : "Contato ainda sem empresa no portal"
          }
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Headphones className="h-4 w-4 text-primary" />
              Contato
            </CardTitle>
            <CardDescription>Dados recebidos da conversa e correspondencia atual no portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3">
              <p className="text-base font-semibold text-foreground">{effectiveContactName || "Nao identificado"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {portalContactMatch?.id
                  ? `Contato localizado no portal (${portalContactMatch.id})`
                  : "Contato ainda nao localizado no portal"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Telefone" value={resolved.customerPhone || "Sem telefone"} />
              <DetailItem label="E-mail" value={resolved.customerEmail || "Sem e-mail"} breakAll />
              <DetailItem
                label="Empresas ligadas"
                value={`${linkedCompanies.length}`}
                helper={linkedCompanies.length > 0 ? "Encontradas no portal" : "Nenhum vinculo encontrado"}
              />
              <DetailItem
                label="Ticket na conversa"
                value={resolved.ticketNumber ? `#${resolved.ticketNumber}` : "Nao referenciado"}
                helper={priorityTicket?.statusLabel || "Sem ticket associado a esta conversa"}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCopySummary}>
                Copiar resumo
              </Button>
              {contactEditHref ? (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href={contactEditHref} target="_blank" rel="noreferrer">
                    <ArrowUpRight className="h-4 w-4" />
                    Editar contato
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Empresa em contexto
            </CardTitle>
            <CardDescription>
              {resolved.companyId
                ? "Empresa liberada para ticket e infraestrutura nesta conversa."
                : "Este contato ainda nao possui empresa vinculada no portal."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {primaryCompany ? (
              <>
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{getCompanyLabel(primaryCompany)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{primaryCompany.razaoSocial}</p>
                    </div>
                    <Badge variant="outline">{resolved.companyId ? "Ativa na conversa" : "Disponivel"}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Empresa principal" value={getCompanyLabel(primaryCompany)} />
                    <DetailItem
                      label="Identificador"
                      value={primaryCompany.id}
                      helper={resolved.companyId ? "Usado nas acoes do painel" : "Pronto para vinculo"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Configuracoes relevantes para o suporte
                  </p>
                  {orderedLinkedCompanies.map((company) => (
                    <CompanyOperationalSettingsCard
                      key={company.id}
                      company={company}
                      isActive={company.id === resolved.companyId}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState label="Nenhuma empresa vinculada encontrada para este contato." />
            )}
          </CardContent>
        </Card>
      </div>

      {!canCreateTicket ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          Este contato ainda nao esta vinculado a uma empresa no portal. Nesse estado o app nao libera criacao manual de ticket.
        </div>
      ) : null}

      {!resolved.companyId ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-amber-600" />
              Vincular empresa ao contato
            </CardTitle>
            <CardDescription>Fluxo guiado para liberar este atendimento no portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <GuidedStep index={1} title="Localizar contato" description="Conferir se o contato ja existe e ajustar o nome antes do vinculo." />
              <GuidedStep index={2} title="Escolher empresa" description="Selecionar a empresa correta para esta conversa." />
              <GuidedStep index={3} title="Liberar operacao" description="Depois do vinculo, o painel passa a abrir ticket e infraestrutura." />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  1. Situacao do contato no portal
                </p>
                {isLoadingPortalContact ? (
                  <div className="mt-2"><InlineLoading label="Verificando contato existente..." /></div>
                ) : portalContactMatch ? (
                  <div className="mt-2 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{portalContactMatch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Contato ja existe no portal{portalContactMatch.companyIds?.length ? " e recebera mais este vinculo." : ", mas ainda esta sem empresa vinculada."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome do contato</label>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          value={contactNameDraft}
                          onChange={(event) => { setContactNameDraft(event.target.value); setCompanyBindingFeedback(null); }}
                          placeholder="Nome usado no portal e no Chatwoot"
                          className="h-10 flex-1 bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleSaveContactName}
                          disabled={!contactNameDraft.trim() || contactNameDraft.trim() === (portalContactMatch.name || "").trim() || isSavingContactName}
                        >
                          {isSavingContactName ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                          Sincronizar nome
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Contato ainda nao localizado</p>
                      <p className="text-xs text-muted-foreground">
                        O app pode criar o contato com os dados atuais da conversa e ja aplicar o vinculo com a empresa escolhida.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome para criar no portal</label>
                      <Input
                        value={contactNameDraft}
                        onChange={(event) => { setContactNameDraft(event.target.value); setCompanyBindingFeedback(null); }}
                        placeholder="Nome que sera usado ao criar o contato"
                        className="h-10 bg-background"
                      />
                    </div>
                  </div>
                )}
                {contactLookupError ? <div className="mt-2"><InlineWarning message={contactLookupError} /></div> : null}
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Escolha a empresa</p>
                <div className="mt-2 space-y-2">
                  <Input
                    value={companySearchTerm}
                    onChange={(event) => setCompanySearchTerm(event.target.value)}
                    placeholder="Buscar empresa por nome fantasia ou razao social"
                    className="bg-background"
                  />
                  {!shouldSearchCompanies ? <EmptyState label="Digite pelo menos 2 caracteres para buscar empresas e vincular este contato." /> : null}
                  {isLoadingCompanyOptions ? <InlineLoading label="Buscando empresas..." /> : null}
                  {companyOptionsError ? <InlineWarning message={companyOptionsError} /> : null}
                  {shouldSearchCompanies && !isLoadingCompanyOptions && !companyOptionsError ? (
                    <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {filteredCompanyOptions.length > 0 ? (
                        filteredCompanyOptions.map((company) => {
                          const isSelected = selectedCompanyId === company.id;
                          return (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => { setSelectedCompanyId(company.id); setCompanyBindingFeedback(null); }}
                              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${isSelected ? "border-primary/40 bg-primary/10" : "border-border/60 bg-background hover:bg-muted/40"}`}
                            >
                              <p className="text-sm font-semibold text-foreground">{getCompanyLabel(company)}</p>
                              <p className="text-xs text-muted-foreground">{company.razaoSocial}</p>
                            </button>
                          );
                        })
                      ) : (
                        <div className="sm:col-span-2"><EmptyState label="Nenhuma empresa encontrada para o filtro atual." /></div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedCompanyOption ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                Empresa selecionada: <span className="font-semibold">{getCompanyLabel(selectedCompanyOption)}</span>
              </div>
            ) : null}

            {companyBindingFeedback ? <InlineNotice tone={companyBindingFeedback.tone} message={companyBindingFeedback.message} /> : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                3. Depois do vinculo, use `Atualizar contexto` se o Chatwoot ainda nao refletir a empresa imediatamente.
              </p>
              <Button type="button" className="gap-2" onClick={handleBindCompany} disabled={!selectedCompanyOption || isBindingCompany}>
                {isBindingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Vincular empresa
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
