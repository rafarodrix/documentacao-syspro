"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, Headphones, Loader2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@dosc-syspro/ui";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import {
  CompanyOperationalSettingsCard,
  DetailItem,
  EmptyState,
  GuidedStep,
  InlineLoading,
  InlineNotice,
  InlineWarning,
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
    <div className="space-y-4">
      {/* Context strip — replaces 3 heavy QuickStatCards */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{latestTickets.length}</span> ticket{latestTickets.length !== 1 ? "s" : ""} aberto{latestTickets.length !== 1 ? "s" : ""}
          {priorityTicket ? <span className="ml-1 text-muted-foreground/70">· #{priorityTicket.number}</span> : null}
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="font-semibold text-foreground">{companyHosts.length}</span> host{companyHosts.length !== 1 ? "s" : ""}
          {recommendedHost ? <span className="ml-1 text-muted-foreground/70">· {recommendedHost.name}</span> : null}
        </span>
        <span className="text-border">|</span>
        <span className={resolved.companyId ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
          {resolved.companyId ? `${linkedCompanies.length} empresa${linkedCompanies.length !== 1 ? "s" : ""} vinculada${linkedCompanies.length !== 1 ? "s" : ""}` : "Sem empresa vinculada"}
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* Contact card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Headphones className="h-4 w-4 text-primary" />
              Contato
            </CardTitle>
            <CardDescription>Dados da conversa e correspondencia no portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card px-3 py-3">
              <p className="text-base font-semibold text-foreground">{effectiveContactName || "Nao identificado"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {portalContactMatch?.id
                  ? `ID ${portalContactMatch.id} no portal`
                  : "Ainda nao localizado no portal"}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailItem label="Telefone" value={resolved.customerPhone || "Sem telefone"} />
              <DetailItem label="E-mail" value={resolved.customerEmail || "Sem e-mail"} breakAll />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCopySummary}>
                Copiar resumo
              </Button>
              {contactEditHref ? (
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link href={contactEditHref} target="_blank" rel="noreferrer">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Editar contato
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Company card */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              Empresa em contexto
            </CardTitle>
            <CardDescription>
              {resolved.companyId
                ? "Empresa ativa para tickets e infraestrutura nesta conversa."
                : "Nenhuma empresa vinculada a este contato ainda."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {primaryCompany ? (
              <>
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{getCompanyLabel(primaryCompany)}</p>
                      {primaryCompany.razaoSocial !== getCompanyLabel(primaryCompany) ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{primaryCompany.razaoSocial}</p>
                      ) : null}
                    </div>
                    <DetailItem
                      label="ID"
                      value={primaryCompany.id}
                      helper={resolved.companyId ? "Ativo nesta conversa" : "Pronto para vínculo"}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Configuracoes operacionais
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

      {/* Company binding wizard — only shown when no company is linked */}
      {!resolved.companyId ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-amber-600" />
                  Vincular empresa ao contato
                </CardTitle>
                <CardDescription className="mt-1">
                  Sem empresa vinculada, tickets e infraestrutura ficam bloqueados.
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                3 passos
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-3">
              <GuidedStep index={1} title="Localizar contato" description="Confirmar ou criar o contato no portal." />
              <GuidedStep index={2} title="Escolher empresa" description="Selecionar a empresa desta conversa." />
              <GuidedStep index={3} title="Liberar operacao" description="Tickets e infraestrutura ficam disponíveis." />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              {/* Step 1 — contact status */}
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  1. Contato no portal
                </p>
                {isLoadingPortalContact ? (
                  <div className="mt-2"><InlineLoading label="Verificando..." /></div>
                ) : portalContactMatch ? (
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{portalContactMatch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {portalContactMatch.companyIds?.length
                          ? "Ja existe no portal — sera adicionado mais um vínculo."
                          : "Existe no portal, mas ainda sem empresa vinculada."}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</label>
                      <div className="flex gap-2">
                        <Input
                          value={contactNameDraft}
                          onChange={(event) => { setContactNameDraft(event.target.value); setCompanyBindingFeedback(null); }}
                          placeholder="Nome no portal e no Chatwoot"
                          className="h-9 flex-1 bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1.5"
                          onClick={handleSaveContactName}
                          disabled={!contactNameDraft.trim() || contactNameDraft.trim() === (portalContactMatch.name || "").trim() || isSavingContactName}
                        >
                          {isSavingContactName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Nao localizado — sera criado com os dados da conversa ao vincular.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome para criar</label>
                      <Input
                        value={contactNameDraft}
                        onChange={(event) => { setContactNameDraft(event.target.value); setCompanyBindingFeedback(null); }}
                        placeholder="Nome que sera usado ao criar o contato"
                        className="h-9 bg-background"
                      />
                    </div>
                  </div>
                )}
                {contactLookupError ? <div className="mt-2"><InlineWarning message={contactLookupError} /></div> : null}
              </div>

              {/* Step 2 — company search */}
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Empresa</p>
                <div className="mt-2 space-y-2">
                  <Input
                    value={companySearchTerm}
                    onChange={(event) => setCompanySearchTerm(event.target.value)}
                    placeholder="Buscar por nome fantasia ou razao social"
                    className="bg-background"
                  />
                  {!shouldSearchCompanies ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">Digite 2+ caracteres para buscar.</p>
                  ) : null}
                  {isLoadingCompanyOptions ? <InlineLoading label="Buscando..." /> : null}
                  {companyOptionsError ? <InlineWarning message={companyOptionsError} /> : null}
                  {shouldSearchCompanies && !isLoadingCompanyOptions && !companyOptionsError ? (
                    <div className="grid max-h-52 gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-2">
                      {filteredCompanyOptions.length > 0 ? (
                        filteredCompanyOptions.map((company) => {
                          const isSelected = selectedCompanyId === company.id;
                          return (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => { setSelectedCompanyId(company.id); setCompanyBindingFeedback(null); }}
                              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${isSelected ? "border-primary/40 bg-primary/10" : "border-border/60 bg-background hover:bg-muted/40"}`}
                            >
                              <p className="font-semibold text-foreground">{getCompanyLabel(company)}</p>
                              {company.razaoSocial !== getCompanyLabel(company) ? (
                                <p className="text-xs text-muted-foreground">{company.razaoSocial}</p>
                              ) : null}
                            </button>
                          );
                        })
                      ) : (
                        <div className="sm:col-span-2">
                          <EmptyState label="Nenhuma empresa encontrada." />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {companyBindingFeedback ? (
              <InlineNotice tone={companyBindingFeedback.tone} message={companyBindingFeedback.message} />
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
              {selectedCompanyOption ? (
                <p className="text-xs text-foreground">
                  Selecionada: <span className="font-semibold">{getCompanyLabel(selectedCompanyOption)}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Selecione a empresa no passo 2 para liberar o vínculo.</p>
              )}
              <Button
                type="button"
                className="gap-2"
                onClick={handleBindCompany}
                disabled={!selectedCompanyOption || isBindingCompany}
              >
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
