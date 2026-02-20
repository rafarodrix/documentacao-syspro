import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Zap, Activity, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Tipos (alinhados com o que o Prisma retorna) ─────────────────────────────

export interface SefazKPI {
  uf: string
  service: "NFE" | "NFCE"
  status: "ONLINE" | "UNSTABLE" | "OFFLINE"
  latency: number
  checkedAt?: Date
}

export interface DashboardStatsProps {
  companiesCount: number
  companiesGrowth: number       // delta do mês atual vs anterior (pode ser negativo)
  usersCount: number
  activeUsersCount: number      // usuários com isActive: true
  sefazNfe: SefazKPI
  sefazNfce: SefazKPI
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface StatusConfig {
  color: string
  bg: string
  border: string
  label: string
  dot: string
}

function getStatusConfig(status: SefazKPI["status"]): StatusConfig {
  const map: Record<SefazKPI["status"], StatusConfig> = {
    ONLINE:   { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Operacional",  dot: "bg-emerald-500" },
    UNSTABLE: { color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   label: "Instável",     dot: "bg-amber-500" },
    OFFLINE:  { color: "text-red-500",     bg: "bg-red-500/10",     border: "border-red-500/20",     label: "Indisponível", dot: "bg-red-500" },
  }
  return map[status]
}

function GrowthIndicator({ value }: { value: number }) {
  if (value === 0) return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> Estável este mês
    </span>
  )
  const positive = value > 0
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", positive ? "text-emerald-500" : "text-red-500")}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{value} este mês
    </span>
  )
}

function LatencyBadge({ latency }: { latency: number }) {
  const quality = latency < 500 ? "Rápido" : latency < 1500 ? "Lento" : "Crítico"
  const color = latency < 500 ? "text-emerald-500" : latency < 1500 ? "text-amber-500" : "text-red-500"
  return (
    <span className={cn("font-mono text-xs", color)}>
      {latency}ms · {quality}
    </span>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DashboardStats({
  companiesCount,
  companiesGrowth,
  usersCount,
  activeUsersCount,
  sefazNfe,
  sefazNfce,
}: DashboardStatsProps) {
  const nfe  = getStatusConfig(sefazNfe.status)
  const nfce = getStatusConfig(sefazNfce.status)

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">

      {/* Empresas Ativas */}
      <Card className="relative overflow-hidden border-border/50 hover:border-border/80 hover:shadow-sm transition-all">
        <div className="absolute top-0 right-0 p-3 opacity-[0.04]">
          <Building2 className="w-20 h-20 text-blue-500 -rotate-12" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Empresas Ativas
          </CardTitle>
          <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-3xl font-bold tracking-tight tabular-nums">
            {companiesCount.toLocaleString("pt-BR")}
          </div>
          <div className="mt-1">
            <GrowthIndicator value={companiesGrowth} />
          </div>
        </CardContent>
      </Card>

      {/* Usuários */}
      <Card className="relative overflow-hidden border-border/50 hover:border-border/80 hover:shadow-sm transition-all">
        <div className="absolute top-0 right-0 p-3 opacity-[0.04]">
          <Users className="w-20 h-20 text-violet-500 rotate-12" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Usuários
          </CardTitle>
          <div className="h-7 w-7 rounded-md bg-violet-500/10 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-violet-500" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-3xl font-bold tracking-tight tabular-nums">
            {usersCount.toLocaleString("pt-BR")}
          </div>
          <div className="mt-1">
            <span className="text-xs text-muted-foreground">
              <span className="text-emerald-500 font-medium">{activeUsersCount}</span> ativos
            </span>
          </div>
        </CardContent>
      </Card>

      {/* SEFAZ NF-e */}
      <Card className={cn("border-border/50 hover:shadow-sm transition-all overflow-hidden", sefazNfe.status !== "ONLINE" && "border-amber-500/30")}>
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            SEFAZ {sefazNfe.uf} · NF-e
          </CardTitle>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", nfe.bg)}>
            <Zap className={cn("h-3.5 w-3.5", nfe.color)} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <span className={cn(
              "relative flex h-2 w-2 flex-shrink-0",
            )}>
              {sefazNfe.status === "ONLINE" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", nfe.dot)} />
            </span>
            <span className={cn("text-2xl font-bold tracking-tight", nfe.color)}>
              {nfe.label}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <LatencyBadge latency={sefazNfe.latency} />
            <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", nfe.border, nfe.color)}>
              Produção
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* SEFAZ NFC-e */}
      <Card className={cn("border-border/50 hover:shadow-sm transition-all overflow-hidden", sefazNfce.status !== "ONLINE" && "border-amber-500/30")}>
        <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            SEFAZ {sefazNfce.uf} · NFC-e
          </CardTitle>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", nfce.bg)}>
            <Activity className={cn("h-3.5 w-3.5", nfce.color)} />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              {sefazNfce.status === "ONLINE" && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", nfce.dot)} />
            </span>
            <span className={cn("text-2xl font-bold tracking-tight", nfce.color)}>
              {nfce.label}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <LatencyBadge latency={sefazNfce.latency} />
            {sefazNfce.status === "UNSTABLE" && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}