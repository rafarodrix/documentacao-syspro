"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Headphones, Loader2, Pencil, Check, X } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@dosc-syspro/ui";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import {
  CompanyOperationalSettingsCard,
  DetailItem,
  EmptyState,
  InlineLoading,
  InlineNotice,
  InlineWarning,
  RemoteHostStatusBadges,
  getCompanyLabel,
} from "../chatwoot-dashboard-ui";

export function ChatwootOverviewTab() {
  const {
    resolved,
    linkedCompanies,
    recommendedHost,
    primaryCompany,
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

  const [isEditingName, setIsEditingName] = useState(false);
  const [forceShowBinding, setForceShowBinding] = useState(false);

  const shouldShowBindingWizard = linkedCompanies.length === 0 || forceShowBinding;

  // Auto-collapse binding wizard when a primary company is successfully set
  useEffect(() => {
    if (primaryCompany) {
      setForceShowBinding(false);
    }
  }, [primaryCompany]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
        <Card className="border-border/30 bg-background/50 backdrop-blur shadow-sm transition-all duration-300 hover:border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Headphones className="h-4 w-4 text-primary" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              {isEditingName ? (
                <div className="group rounded-xl border border-primary/20 bg-background/50 backdrop-blur px-3 py-2 transition-all duration-300 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-primary">Contato</p>
                  <div className="flex gap-2 items-center mt-1">
                    <Input
                      value={contactNameDraft}
                      onChange={(e) => setContactNameDraft(e.target.value)}
                      className="h-8 text-xs bg-background/50 border-border/30"
                      placeholder="Nome do contato"
                      disabled={isSavingContactName}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 shrink-0 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={async () => {
                        await handleSaveContactName();
                        setIsEditingName(false);
                      }}
                      disabled={isSavingContactName || !contactNameDraft.trim()}
                    >
                      {isSavingContactName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => {
                        setContactNameDraft(portalContactMatch?.name || resolved.contactName || "");
                        setIsEditingName(false);
                      }}
                      disabled={isSavingContactName}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/80">
                    {portalContactMatch?.id ? `ID ${portalContactMatch.id} no portal` : "Ainda nao localizado"}
                  </p>
                </div>
              ) : (
                <div className="relative group">
                  <DetailItem
                    label="Contato"
                    value={effectiveContactName || "Nao identificado"}
                    helper={portalContactMatch?.id ? `ID ${portalContactMatch.id} no portal` : "Ainda nao localizado no portal"}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setContactNameDraft(effectiveContactName || "");
                      setIsEditingName(true);
                    }}
                    className="absolute right-2 top-2 p-1 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100 duration-200"
                    title="Editar nome"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <DetailItem
                label="Portal"
                value={portalContactMatch ? "Correspondencia encontrada" : "Sem correspondencia"}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <DetailItem label="Telefone" value={resolved.customerPhone || "Sem telefone"} />
              <DetailItem label="E-mail" value={resolved.customerEmail || "Sem e-mail"} breakAll />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={handleCopySummary}>
                Copiar resumo
              </Button>
              {contactEditHref ? (
                <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 px-3 text-xs">
                  <Link href={contactEditHref} target="_blank" rel="noreferrer">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Editar contato
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/30 bg-background/50 backdrop-blur shadow-sm transition-all duration-300 hover:border-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                Empresa ativa
              </CardTitle>
              {linkedCompanies.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-[10px] uppercase font-bold text-primary hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() => setForceShowBinding((current) => !current)}
                >
                  {shouldShowBindingWizard ? "Cancelar vinculo" : "+ Vincular outra empresa"}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {primaryCompany ? (
              <>
                <div className="rounded-2xl border border-border/30 bg-background/30 backdrop-blur px-3 py-3 shadow-md transition-all duration-300 hover:border-primary/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground tracking-tight">{getCompanyLabel(primaryCompany)}</p>
                      {primaryCompany.razaoSocial !== getCompanyLabel(primaryCompany) ? (
                        <p className="mt-0.5 text-xs text-muted-foreground/80">{primaryCompany.razaoSocial}</p>
                      ) : null}
                    </div>
                    <div className="min-w-[11rem] max-w-full">
                      <DetailItem label="ID" value={primaryCompany.id} helper="Ativa nesta conversa" breakAll />
                    </div>
                  </div>

                  {recommendedHost ? (
                    <div className="mt-3 rounded-xl border border-border/30 bg-background/40 hover:bg-background/60 hover:border-primary/20 backdrop-blur px-3 py-2.5 transition-all duration-300 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{recommendedHost.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/90">Host recomendado neste contexto.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <RemoteHostStatusBadges host={recommendedHost} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <CompanyOperationalSettingsCard company={primaryCompany} isActive />
              </>
            ) : (
              <EmptyState label="Selecione uma empresa no topo do painel para carregar os dados operacionais desta conversa." />
            )}
          </CardContent>
        </Card>
      </div>

      {shouldShowBindingWizard ? (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-amber-600" />
              Vincular empresa ao contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. Contato no portal</p>
                {isLoadingPortalContact ? (
                  <div className="mt-2">
                    <InlineLoading label="Verificando..." />
                  </div>
                ) : portalContactMatch ? (
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{portalContactMatch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {portalContactMatch.companyIds?.length
                          ? "Ja existe no portal - sera adicionado mais um vinculo."
                          : "Existe no portal, mas ainda sem empresa vinculada."}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</label>
                      <div className="flex gap-2">
                        <Input
                          value={contactNameDraft}
                          onChange={(event) => {
                            setContactNameDraft(event.target.value);
                            setCompanyBindingFeedback(null);
                          }}
                          placeholder="Nome no portal e no Chatwoot"
                          className="h-9 flex-1 bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 gap-1.5 px-3 text-xs"
                          onClick={handleSaveContactName}
                          disabled={
                            !contactNameDraft.trim() ||
                            contactNameDraft.trim() === (portalContactMatch.name || "").trim() ||
                            isSavingContactName
                          }
                        >
                          {isSavingContactName ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Nao localizado - sera criado com os dados da conversa ao vincular.
                    </p>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Nome para criar
                      </label>
                      <Input
                        value={contactNameDraft}
                        onChange={(event) => {
                          setContactNameDraft(event.target.value);
                          setCompanyBindingFeedback(null);
                        }}
                        placeholder="Nome que sera usado ao criar o contato"
                        className="h-9 bg-background"
                      />
                    </div>
                  </div>
                )}
                {contactLookupError ? (
                  <div className="mt-2">
                    <InlineWarning message={contactLookupError} />
                  </div>
                ) : null}
              </div>

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
                              onClick={() => {
                                setSelectedCompanyId(company.id);
                                setCompanyBindingFeedback(null);
                              }}
                              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                isSelected
                                  ? "border-primary/40 bg-primary/10"
                                  : "border-border/60 bg-background hover:bg-muted/40"
                              }`}
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
                <p className="text-xs text-muted-foreground">Selecione a empresa no passo 2 para liberar o vinculo.</p>
              )}
              <Button
                type="button"
                size="sm"
                className="h-9 gap-2 px-3 text-xs"
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
