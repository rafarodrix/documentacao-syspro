import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getMyTicketsAction } from "./_actions/ticket-actions";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Ticket, Search, Building2,
  CheckCircle2, Clock, ArrowUpRight, ExternalLink, Activity
} from "lucide-react";
import Link from "next/link";

// Importação do novo componente de Abertura de Chamado
import { TicketSheet } from "@/components/platform/client/TicketSheet";

export default async function ClientDashboardPage() {
  const session = await getProtectedSession();
  if (!session) return null;

  // Busca de dados paralela
  const [user, ticketsRes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      include: { companies: true }
    }),
    getMyTicketsAction()
  ]);

  const userName = user?.name || session.email.split('@')[0];
  const userCompany = user?.companies[0]?.razaoSocial || "Minha Empresa";

  // Processamento de Tickets
  const tickets = ticketsRes.success && ticketsRes.data ? ticketsRes.data : [];

  // Filtros flexíveis para pegar status do Zammad (em inglês ou português mapeado)
  const openTicketsCount = tickets.filter((t: any) =>
    ['Aberto', 'Em Análise', 'Novo', 'new', 'open', 'pending'].includes(t.status)
  ).length;

  const resolvedTicketsCount = tickets.filter((t: any) =>
    ['Resolvido', 'Fechado', 'closed', 'merged'].includes(t.status)
  ).length;

  const recentTickets = tickets.slice(0, 5); // Mostrar apenas os 5 mais recentes na dashboard

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* --- CABEÇALHO (Magic UI) --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Olá, {userName}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-primary w-fit">
              <Building2 className="h-3.5 w-3.5" />
              <span className="font-medium">{userCompany}</span>
            </div>
            <span>•</span>
            <span className="text-xs">Painel de Controle</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/docs">
            <Button variant="outline" className="h-10 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              Base de Conhecimento
            </Button>
          </Link>

          {/* INTEGRAÇÃO REAL: Botão de Novo Chamado via Zammad API */}
          <TicketSheet />

        </div>
      </div>

      {/* --- KPIs (Cards com Gradientes) --- */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Card 1: Abertos */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-blue-500/5 hover:border-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chamados Abertos</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ticket className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{openTicketsCount}</div>
            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Aguardando atendimento
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Resolvidos */}
        <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-green-500/5 hover:border-green-500/30 transition-all duration-300 shadow-sm hover:shadow-md group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolvidos</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{resolvedTicketsCount}</div>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Total finalizado
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Atalho Docs */}
        <Link href="/docs/manual" className="block h-full">
          <Card className="relative h-full overflow-hidden border-border/50 bg-gradient-to-br from-background to-purple-500/5 hover:border-purple-500/30 transition-all duration-300 shadow-sm hover:shadow-md group cursor-pointer">
            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Acesse o Manual</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ExternalLink className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-foreground mt-1">Dúvidas sobre emissão?</div>
              <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
                Ler documentação <ArrowUpRight className="h-3 w-3" />
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* --- TABELA DE CHAMADOS --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Seus Chamados Recentes
          </h2>
          {tickets.length > 5 && (
            <Link href="/dashboard/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px]">Ticket #</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[150px]">Prioridade</TableHead>
                <TableHead className="text-right">Atualizado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Ticket className="h-5 w-5 opacity-50" />
                      </div>
                      <p>Nenhum chamado encontrado.</p>
                      <p className="text-xs text-muted-foreground mt-1">Seus novos tickets aparecerão aqui.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                recentTickets.map((ticket: any) => (
                  <TableRow key={ticket.id} className="group hover:bg-muted/30 transition-colors cursor-pointer">
                    <TableCell className="font-mono font-medium text-muted-foreground group-hover:text-primary transition-colors">
                      #{ticket.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ticket.subject}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {ticket.lastUpdate}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/* --- Subcomponentes para Badges --- */

function StatusBadge({ status }: { status: string }) {
  // Normaliza para lowercase para facilitar o match
  const s = status?.toLowerCase() || '';

  let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400';

  if (['novo', 'new', 'aberto', 'open'].includes(s)) {
    style = 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900 dark:text-blue-400';
  } else if (['em análise', 'pending', 'pending_reminder'].includes(s)) {
    style = 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900 dark:text-amber-400';
  } else if (['resolvido', 'closed', 'fechado', 'merged'].includes(s)) {
    style = 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-900 dark:text-green-400';
  }

  return (
    <Badge variant="outline" className={`border ${style} font-normal capitalize`}>
      {status}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority?.toLowerCase() || '';

  if (p.includes('alta') || p.includes('high') || p.includes('3')) {
    return <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium"><div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Alta</div>
  }
  if (p.includes('média') || p.includes('normal') || p.includes('2')) {
    return <div className="flex items-center gap-1.5 text-blue-500 text-xs font-medium"><div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Normal</div>
  }
  return <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium"><div className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Baixa</div>
}