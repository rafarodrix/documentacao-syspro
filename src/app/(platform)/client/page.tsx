import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma"; // Importar o Prisma
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Ticket, PlusCircle, BookOpen, Clock, CheckCircle2, Search, Building2
} from "lucide-react";
import Link from "next/link";

// Dados Mockados (Mantidos por enquanto, até integrarmos o Zammad)
const recentTickets = [
  { id: "TK-9823", subject: "Erro na emissão de NF-e (Rejeição 203)", status: "Aberto", date: "Hoje, 10:23", priority: "Alta" },
  { id: "TK-9821", subject: "Dúvida sobre cadastro de produto", status: "Em Análise", date: "Ontem, 16:40", priority: "Média" },
  { id: "TK-9755", subject: "Configuração de impressora térmica", status: "Resolvido", date: "22/11/2025", priority: "Baixa" },
];

export default async function ClientDashboardPage() {
  const session = await getProtectedSession();

  if (!session) return null; // Segurança extra

  // 1. Busca dados detalhados do usuário no banco
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      companies: true // Traz as empresas vinculadas
    }
  });

  const userName = user?.name || session.email.split('@')[0];
  const userCompany = user?.companies[0]?.razaoSocial || "Sem Empresa Vinculada";

  return (
    <div className="space-y-8">

      {/* 1. Seção de Boas-vindas */}
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
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Abrir Novo Chamado
          </Button>
        </div>
      </div>

      {/* ... (O resto dos cards e tabela permanece igual por enquanto) ... */}
      {/* Apenas copie o resto do seu JSX original abaixo desta linha */}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chamados Abertos</CardTitle>
            <Ticket className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Aguardando resposta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h 15m</div>
            <p className="text-xs text-muted-foreground">Para primeira resposta</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidos (Mês)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">+3 em relação ao mês passado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/docs/manual" className="group">
          <Card className="h-full transition-all hover:border-primary/50 hover:shadow-sm">
            <CardHeader>
              <CardTitle className="text-base group-hover:text-primary flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Manual do Sistema
              </CardTitle>
              <CardDescription>Guias passo a passo de todas as funções.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Chamados Recentes</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Atualizado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.id}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        ticket.status === "Aberto" ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/25" :
                          ticket.status === "Resolvido" ? "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25" :
                            "bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25"
                      }
                    >
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ticket.priority}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{ticket.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}