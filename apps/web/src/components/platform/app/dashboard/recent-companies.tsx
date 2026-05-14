import Link from "next/link"
import { Badge, Button } from "@dosc-syspro/ui";
import { Building2, ArrowUpRight, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { CompanyStatus } from "@prisma/client"
import { EmptyState, SectionCard } from "@/components/patterns";

export interface RecentCompanyItem {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string
  status: CompanyStatus
  cidade?: string | null
  estado?: string | null
  createdAt: Date | string | null
  contactsCount?: number
  _count?: { memberships: number; contactLinks?: number }
}

interface RecentCompaniesProps {
  companies: RecentCompanyItem[]
}

const STATUS_CONFIG: Record<CompanyStatus, { label: string; class: string }> = {
  ACTIVE: { label: "Ativa", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  INACTIVE: { label: "Inativa", class: "bg-muted text-muted-foreground border-border" },
  SUSPENDED: { label: "Suspensa", class: "bg-red-500/10 text-red-600 border-red-500/20" },
  PENDING_DOCS: { label: "Docs Pend.", class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
}

function formatCNPJ(cnpj: string) {
  const clean = cnpj.replace(/\D/g, "")
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "Data indisponivel"

  const normalized = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(normalized.getTime())) return "Data invalida"

  const now = new Date()
  const diff = Math.floor((now.getTime() - normalized.getTime()) / 1000 / 60 / 60)
  if (diff < 1) return "Agora mesmo"
  if (diff < 24) return `Ha ${diff}h`

  const days = Math.floor(diff / 24)
  if (days === 1) return "Ontem"
  if (days < 7) return `Ha ${days} dias`

  return normalized.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function getInitials(name: string): string {
  return name.trim().split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

export function RecentCompanies({ companies }: RecentCompaniesProps) {
  return (
    <SectionCard
      title="Empresas recentes"
      description="Ultimas empresas registradas no escopo atual."
      action={
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" asChild>
          <Link href="/portal/cadastros">
            Abrir lista
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      }
      className="w-full flex flex-col border-border/50"
      contentClassName="flex-1"
    >
      {companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma empresa recente"
            description="Os novos registros de empresa serao exibidos aqui."
            className="h-full min-h-60"
            action={{ label: "Nova empresa", href: "/portal/cadastros" }}
          />
        ) : (
          <div className="space-y-1">
            {companies.map((company) => {
              const statusCfg = STATUS_CONFIG[company.status]
              const location = [company.cidade, company.estado].filter(Boolean).join(", ")

              return (
                <Link
                  key={company.id}
                  href={`/portal/cadastros/empresa?empresa=${company.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 -mx-1 rounded-lg hover:bg-muted/60 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-linear-to-br from-muted to-muted/60 border border-border/50 flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground group-hover:border-border/80 transition-colors">
                    {getInitials(company.nomeFantasia || company.razaoSocial)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate leading-tight">
                        {company.nomeFantasia || company.razaoSocial}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 shrink-0 border", statusCfg.class)}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">
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

                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted-foreground">
                      {formatRelativeDate(company.createdAt)}
                    </p>
                    {company._count || typeof company.contactsCount === "number" ? (
                      <p className="text-[11px] text-muted-foreground/60">
                        {(company.contactsCount ?? company._count?.contactLinks ?? 0)}{" "}
                        {(company.contactsCount ?? company._count?.contactLinks ?? 0) === 1 ? "contato" : "contatos"}
                      </p>
                    ) : null}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
    </SectionCard>
  )
}
