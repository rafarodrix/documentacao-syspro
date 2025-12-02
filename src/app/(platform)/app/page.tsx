import { getClientDashboardData } from "@/actions/tickets/dashboard"
import { Button } from "@/components/ui/button"
import { Building2, Search } from "lucide-react"
import Link from "next/link"

// Importação dos Componentes Refatorados
import { TicketSheet } from "@/components/platform/tickets/TicketSheet"
import { DashboardStats } from "@/components/platform/app/dashboard/DashboardStats"

export default async function ClientDashboardPage() {
  // 1. Busca todos os dados de uma vez na Action otimizada
  const { data, error } = await getClientDashboardData()

  if (error || !data) {
    return <div className="p-8 text-center text-red-500">Erro ao carregar dashboard. Tente recarregar.</div>
  }

  const { user, kpis, tickets } = data

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* --- CABEÇALHO --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Olá, {user.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-primary w-fit">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-medium">{user.company}</span>
            </div>
            <span>•</span>
            <span className="text-xs">Painel de Controle</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/docs">
            <Button variant="outline" className="h-10 border-primary/20 hover:bg-primary/5">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              Base de Conhecimento
            </Button>
          </Link>
          <TicketSheet />
        </div>
      </div>

      {/* --- CARDS KPI --- */}
      <DashboardStats kpis={kpis} />

    </div>
  )
}