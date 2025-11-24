import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getMyTicketsAction } from "./_actions/ticket-actions";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Ticket, PlusCircle, BookOpen, Clock, CheckCircle2, Search, Building2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

export default async function ClientDashboardPage() {
  const session = await getProtectedSession();
  if (!session) return null;

  // 1. Busca dados do usuário e da empresa (Paralelo)
  // 2. Busca os tickets no Zammad (Paralelo)
  const [user, ticketsRes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      include: { companies: true }
    }),
    getMyTicketsAction()
  ]);

  const userName = user?.name || session.email.split('@')[0];
  const userCompany = user?.companies[0]?.razaoSocial || "Sem Empresa Vinculada";

  // Pega os tickets reais ou array vazio
  const tickets = ticketsRes.success && ticketsRes.data ? ticketsRes.data : [];

  // Calcula métricas simples baseadas nos tickets reais
  const openTicketsCount = tickets.filter(t => t.status === 'Aberto' || t.status === 'Em Análise').length;
  const resolvedTicketsCount = tickets.filter(t => t.status === 'Resolvido').length;

  return (
    <div className="space-y-8">

      {/* Cabeçalho (Igual) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá, {userName}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <Building2 className="h-4 w-4" />
            <span>{userCompany}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/docs">
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Pesquisar Ajuda
            </Button>
          </Link>
          {/* Link para abrir ticket (Pode ser um mailto ou link externo do Zammad por enquanto) */}
          <Link href="mailto:suporte@trilink.com.br">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Abrir Novo Chamado
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs Reais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chamados Abertos</CardTitle>
            <Ticket className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTicketsCount}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
        {/* ... Outros cards de métricas ... */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos (Recentes)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTicketsCount}</div>
            <p className="text-xs text-muted-foreground">Últimos 10 tickets</p>
          </CardContent>
        </Card>
      </div>

      {/* ... Cards de Atalho (Manter igual) ... */}

      {/* Tabela de Chamados Reais */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Seus Chamados Recentes</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ticket #</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Atualizado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Nenhum chamado encontrado para este e-mail.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.id}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          ticket.status === "Aberto" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" :
                            ticket.status === "Resolvido" ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                              "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ticket.priority}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{ticket.lastUpdate}</TableCell>
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