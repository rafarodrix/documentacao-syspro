import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTicketsByUserId } from "@/lib/releases";
import type { UserTicket } from "@/lib/types";
import {
  User,
  Ticket,
  ExternalLink,
  Building,
  PlusCircle,
  Check,
  Clock,
} from "lucide-react";
import Link from "next/link";
import React from "react";

// --- Tipos Auxiliares ---
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}

interface TicketListProps {
  tickets: UserTicket[];
  title: string;
  emptyMessage: string;
  showStatusColors?: boolean;
}

// --- Componente: Cartão de Estatísticas ---
function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="p-4 border rounded-lg bg-card shadow-sm flex items-center gap-4 transition-all hover:border-primary/50 hover:shadow-md">
      {icon}
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// --- Componente: Lista de Tickets ---
function TicketList({
  tickets,
  title,
  emptyMessage,
  showStatusColors = true,
}: TicketListProps) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Ticket className="w-5 h-5 text-muted-foreground" />
        {title}
      </h2>

      {tickets.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={ticket.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir ticket ${ticket.number}`}
              className="group block p-4 border rounded-lg bg-card transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    #{ticket.number} — {ticket.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Última atualização: {ticket.lastUpdate}
                  </p>
                </div>

                {showStatusColors && (
                  <div className="flex items-center gap-2 text-sm flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === "Fechado"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                    >
                      {ticket.status}
                    </span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// --- Componente Principal: Portal do Cliente ---
export default async function PortalPage() {
  const session = await getServerSession(authOptions);

  // Redireciona se não autenticado
  if (!session?.user?.id) redirect("/login?callbackUrl=/portal");

  const allUserTickets = await getTicketsByUserId(session.user.id);
  const openTickets = allUserTickets.filter((t) => t.status !== "Fechado");
  const closedTickets = allUserTickets.filter((t) => t.status === "Fechado");

  const userName = session.user.name?.split(" ")[0] ?? "Usuário";

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portal do Cliente</h1>
          <p className="text-muted-foreground">
            Bem-vindo(a) de volta, {userName}.
          </p>
        </div>

        <Link
          href={process.env.ZAMMAD_URL || "#"}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir novo chamado no Zammad"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md hover:bg-primary/90 transition-all shadow-md"
        >
          <PlusCircle size={18} />
          Abrir Novo Chamado
        </Link>
      </header>

      {/* Estatísticas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Chamados Abertos"
          value={openTickets.length}
          icon={<Clock className="w-8 h-8 text-amber-500" />}
        />
        <StatCard
          title="Chamados Fechados"
          value={closedTickets.length}
          icon={<Check className="w-8 h-8 text-green-500" />}
        />
        <StatCard
          title="Usuário"
          value={session.user.name ?? "Desconhecido"}
          icon={<User className="w-8 h-8 text-muted-foreground" />}
        />
        {session.user.organizationId && (
          <StatCard
            title="Organização"
            value={session.user.organizationId}
            icon={<Building className="w-8 h-8 text-muted-foreground" />}
          />
        )}
      </section>

      {/* Chamados */}
      <TicketList
        tickets={openTickets}
        title="Meus Chamados Abertos"
        emptyMessage="Nenhum chamado aberto no momento."
      />

      {closedTickets.length > 0 && (
        <TicketList
          tickets={closedTickets}
          title="Histórico de Chamados Fechados"
          emptyMessage="Nenhum chamado fechado encontrado."
        />
      )}
    </main>
  );
}
