import Link from "next/link";
import { Badge, Button } from "@dosc-syspro/ui";
import { ArrowUpRight, MapPin } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
import { EmptyState, SectionCard } from "@/components/patterns";
import { formatCNPJ } from "@/lib/formatters";

type CompanyStatusValue = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_DOCS";

export interface RecentCompanyItem {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  status: CompanyStatusValue | string;
  cidade?: string | null;
  estado?: string | null;
  createdAt: Date | string | null;
  contactsCount?: number;
  _count?: { memberships: number; contactLinks?: number };
}

interface RecentCompaniesProps {
  title?: string;
  companies: RecentCompanyItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  createHref?: string;
}

const STATUS_CONFIG: Record<CompanyStatusValue, { label: string; class: string }> = {
  ACTIVE: { label: "Ativa", class: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" },
  INACTIVE: { label: "Inativa", class: "border-border bg-muted text-muted-foreground" },
  SUSPENDED: { label: "Suspensa", class: "border-red-500/20 bg-red-500/10 text-red-600" },
  PENDING_DOCS: { label: "Docs Pend.", class: "border-amber-500/20 bg-amber-500/10 text-amber-600" },
};

const FALLBACK_STATUS = {
  label: "Status",
  class: "border-border bg-muted text-muted-foreground",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function RecentCompanies({
  title = "Empresas recentes",
  companies,
  emptyTitle = "Nenhuma empresa recente",
  emptyDescription = "Os novos registros de empresa aparecerao aqui.",
  createHref = "/portal/cadastros/empresa/novo",
}: RecentCompaniesProps) {
  return (
    <SectionCard
      title={title}
      action={
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" asChild>
          <Link href="/portal/cadastros">
            Abrir lista
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      }
      className="flex w-full flex-col border-border/50"
      contentClassName="flex-1"
    >
      {companies.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          className="h-full min-h-48"
          action={{ label: "Adicionar empresa", href: createHref }}
        />
      ) : (
        <div className="space-y-1">
          {companies.map((company) => {
            const statusCfg = STATUS_CONFIG[company.status as CompanyStatusValue] ?? FALLBACK_STATUS;
            const location = [company.cidade, company.estado].filter(Boolean).join(", ");
            const contactsCount = company.contactsCount ?? company._count?.contactLinks ?? 0;

            return (
              <Link
                key={company.id}
                href={`/portal/cadastros/empresa?empresa=${company.id}`}
                className="group -mx-1 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-linear-to-br from-muted to-muted/60 text-[11px] font-bold text-muted-foreground transition-colors group-hover:border-border/80">
                  {getInitials(company.nomeFantasia || company.razaoSocial)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium leading-tight text-foreground">
                      {company.nomeFantasia || company.razaoSocial}
                    </span>
                    <Badge variant="outline" className={cn("h-4 shrink-0 border px-1.5 text-[10px]", statusCfg.class)}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatCNPJ(company.cnpj)}
                    </span>
                    {location ? (
                      <>
                        <span className="text-muted-foreground/30">.</span>
                        <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {location}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-muted-foreground">{formatRelativeDate(company.createdAt)}</p>
                  {(company._count || typeof company.contactsCount === "number") ? (
                    <p className="text-[11px] text-muted-foreground/60">
                      {contactsCount} {contactsCount === 1 ? "contato" : "contatos"}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
