import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, ArrowUpRight, Plus, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CompanyStatus } from "@prisma/client"

// ─── Tipo alinhado com o select do Prisma ────────────────────────────────────

export interface RecentCompanyItem {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string
  status: CompanyStatus
  cidade?: string | null
  estado?: string | null
  createdAt: Date
  _count?: { memberships: number }
}

interface RecentCompaniesProps {
  companies: RecentCompanyItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CompanyStatus, { label: string; class: string }> = {
  ACTIVE:       { label: "Ativa",        class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  INACTIVE:     { label: "Inativa",      class: "bg-muted text-muted-foreground border-border" },
  SUSPENDED:    { label: "Suspensa",     class: "bg-red-500/10 text-red-600 border-red-500/20" },
  PENDING_DOCS: { label: "Docs Pend.",   class: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
}

function formatCNPJ(cnpj: string) {
  const clean = cnpj.replace(/\D/g, "")
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60 / 60)
  if (diff < 1) return "Agora mesmo"
  if (diff < 24) return `Há ${diff}h`
  const days = Math.floor(diff / 24)
  if (days === 1) return "Ontem"
  if (days < 7) return `Há ${days} dias`
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function getInitials(name: string): string {
  return name.trim().split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function RecentCompanies({ companies }: RecentCompaniesProps) {
  return (
    <Card className="col-span-3 flex flex-col border-border/50">
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Últimos Cadastros</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Empresas recentes na plataforma
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" asChild>
            <Link href="/app/cadastros">
              Ver todos
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 flex-1">
        {companies.length === 0 ? (
          // ─── Estado Vazio ─────────────────────────────────────────────────
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center border border-border">
              <Building2 className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nenhuma empresa cadastrada</p>
              <p className="text-xs text-muted-foreground">Cadastros aparecerão aqui assim que criados.</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-dashed h-8" asChild>
              <Link href="/app/cadastros">
                <Plus className="h-3.5 w-3.5" />
                Cadastrar empresa
              </Link>
            </Button>
          </div>
        ) : (
          // ─── Lista Real ───────────────────────────────────────────────────
          <div className="space-y-1">
            {companies.map((company) => {
              const statusCfg = STATUS_CONFIG[company.status]
              const location = [company.cidade, company.estado].filter(Boolean).join(", ")

              return (
                <Link
                  key={company.id}
                  href={`/app/cadastros?empresa=${company.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 -mx-1 rounded-lg hover:bg-muted/60 transition-colors group"
                >
                  {/* Avatar com iniciais */}
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-muted to-muted/60 border border-border/50 flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground group-hover:border-border/80 transition-colors">
                    {getInitials(company.nomeFantasia || company.razaoSocial)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate leading-tight">
                        {company.nomeFantasia || company.razaoSocial}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 flex-shrink-0 border", statusCfg.class)}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatCNPJ(company.cnpj)}
                      </span>
                      {location && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <MapPin className="h-2.5 w-2.5" />
                            {location}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Data + membros */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-muted-foreground">
                      {formatRelativeDate(company.createdAt)}
                    </p>
                    {company._count && (
                      <p className="text-[11px] text-muted-foreground/60">
                        {company._count.memberships} {company._count.memberships === 1 ? "usuário" : "usuários"}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}