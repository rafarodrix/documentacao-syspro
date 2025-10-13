import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTicketsByUserId } from "@/lib/releases";
import type { UserTicket } from "@/lib/types";
import { User, Ticket, ExternalLink, Building, PlusCircle, Check, Clock } from "lucide-react";
import Link from "next/link";

// --- Componente para o Card de Estatísticas ---
function StatCard({ title, value, icon }: { title: string, value: number | string, icon: React.ReactNode }) {
    return (
        <div className="p-4 border rounded-lg bg-card flex items-center gap-4">
            {icon}
            <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
        </div>
    );
}

// --- Componente para a Lista de Tickets ---
function TicketList({ tickets }: { tickets: UserTicket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg mt-4">
        <p>Nenhum chamado encontrado com este status.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {tickets.map(ticket => (
        <a 
          key={ticket.id} 
          href={ticket.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="no-underline group block p-4 border rounded-lg bg-card hover:border-primary transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="space-y-1">
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">#{ticket.number} - {ticket.title}</p>
              <p className="text-sm text-muted-foreground">Última atualização: {ticket.lastUpdate}</p>
            </div>
            <div className="flex items-center gap-2 text-sm flex-shrink-0">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                ticket.status === 'Fechado' ? 'bg-red-500/10 text-red-700' : 'bg-green-500/10 text-green-700'
              }`}>
                {ticket.status}
              </span>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// --- Componente Principal da Página (Server Component) ---
export default async function PortalPage() {
  const session = await getServerSession(authOptions);
    console.log("DADOS DA SESSÃO:", session); 

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/portal');
  }

  const allUserTickets = await getTicketsByUserId(session.user.id);

  // Filtra os tickets em abertos e fechados
  const openTickets = allUserTickets.filter(t => t.status !== 'Fechado');
  const closedTickets = allUserTickets.filter(t => t.status === 'Fechado');

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Portal do Cliente</h1>
          <p className="text-muted-foreground">Bem-vindo(a) de volta, {session.user.name?.split(' ')[0]}.</p>
        </div>
        <a
            href={process.env.ZAMMAD_URL} // Link para abrir um novo chamado no Zammad
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-md"
        >
            <PlusCircle size={18} />
            Abrir Novo Chamado
        </a>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Chamados Abertos" value={openTickets.length} icon={<Clock className="w-8 h-8 text-amber-500" />} />
        <StatCard title="Chamados Fechados" value={closedTickets.length} icon={<Check className="w-8 h-8 text-green-500" />} />
        <StatCard title="Usuário" value={session.user.name || ''} icon={<User className="w-8 h-8 text-muted-foreground" />} />
        {session.user.organizationId && (
            <StatCard title="ID da Organização" value={session.user.organizationId} icon={<Building className="w-8 h-8 text-muted-foreground" />} />
        )}
      </div>

      {/* Seção da Lista de Tickets */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Meus Chamados Abertos
        </h2>
        <TicketList tickets={openTickets} />
      </div>

       {/* Seção Opcional de Tickets Fechados */}
      {closedTickets.length > 0 && (
        <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-muted-foreground" />
                Histórico de Chamados Fechados
            </h2>
            <TicketList tickets={closedTickets} />
        </div>
      )}
    </main>
  );
}