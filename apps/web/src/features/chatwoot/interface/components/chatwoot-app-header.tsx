"use client";

import Link from "next/link";
import { buildChatwootContactDisplayName } from "@dosc-syspro/shared/chatwoot-contact-presentation";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import { getCompanyLabel } from "../chatwoot-dashboard-ui";

export function ChatwootAppHeader() {
  const {
    status,
    resolved,
    effectiveContactName,
    linkedCompanies,
    contactEditHref,
    requestRefresh,
    handleSelectContextCompany,
  } = useChatwootDashboard();

  const hasResolvedContext = Boolean(resolved.companyName || effectiveContactName || resolved.contactName);
  const contextLabel = hasResolvedContext
    ? buildChatwootContactDisplayName({
        companyName: resolved.companyName,
        contactName: effectiveContactName || resolved.contactName,
      })
    : linkedCompanies.length > 1
      ? "Selecionar empresa em contexto"
      : "Sem empresa em contexto";

  return (
    <div className="border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="space-y-3 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Painel do Atendimento</p>
                <p className="truncate text-xs text-muted-foreground">{contextLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={requestRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
            {contactEditHref ? (
              <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                <Link href={contactEditHref} target="_blank" rel="noreferrer">
                  Contato
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {linkedCompanies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {linkedCompanies.map((company) => {
              const isActive = company.id === resolved.companyId;
              return (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => handleSelectContextCompany(company.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {getCompanyLabel(company)}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
