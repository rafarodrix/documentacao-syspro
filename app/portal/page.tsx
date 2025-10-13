import { getServerSession } from "next-auth/next";
import { NavigationCards } from "@/components/NavigationCards";
import {BookOpen, HelpCircle, GraduationCap, Wrench, } from "lucide-react";
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

  if (!session?.user?.id) redirect("/login?callbackUrl=/portal");

  const allUserTickets = await getTicketsByUserId(session.user.id);
  const openTickets = allUserTickets.filter((t) => t.status !== "Fechado");
  const closedTickets = allUserTickets.filter((t) => t.status === "Fechado");
  const userName = session.user.name?.split(" ")[0] ?? "Usuário";

  // **1. Defina os dados para os cards aqui dentro da página**
  const portalNavLinks = [
    {
      icon: BookOpen,
      title: "Documentação Completa",
      description: "Navegue por todos os módulos e funcionalidades.",
      href: "/docs",
    },
    {
      icon: HelpCircle,
      title: "Dúvidas Frequentes",
      description: "Respostas rápidas para as perguntas mais comuns.",
      href: "/faq",
    },
    {
      icon: GraduationCap,
      title: "Guias e Tutoriais",
      description: "Aprenda tarefas com nossos guias práticos.",
      href: "/guides",
    },
    {
      icon: Wrench,
      title: "Central de Suporte",
      description: "Precisa de ajuda? Contate nossa equipe.",
      href: process.env.ZAMMAD_URL || "#",
    },
  ];

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
        >
          <PlusCircle size={18} />
          Abrir Novo Chamado
        </Link>
      </header>

      {/* Cards de Navegação */}
      <NavigationCards links={portalNavLinks} />

      {/* Estatísticas */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Chamados Abertos"
          value={openTickets.length}
          icon={<Clock className="w-8 h-8 text-amber-500" />}
        />
        {/* ...outros StatCards ... */}
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