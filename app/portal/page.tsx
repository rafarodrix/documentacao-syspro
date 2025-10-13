import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

// Imports de lógica e tipos
import { authOptions } from "@/lib/auth";
import { getTicketsByUserId } from "@/lib/releases";

// Imports de componentes
import { ResourceCards } from "@/components/ResourceCards";
import { StatCard } from "@/components/portal/StatCard";
import { TicketList } from "@/components/portal/TicketList";

// Imports de ícones
import { User, Building, PlusCircle, Check, Clock } from "lucide-react";

export default async function PortalPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/portal");
  }

  // Busca e processamento de dados
  const allUserTickets = await getTicketsByUserId(session.user.id);
  const openTickets = allUserTickets.filter((t) => t.status !== "Fechado");
  const closedTickets = allUserTickets.filter((t) => t.status === "Fechado");
  const userName = session.user.name?.split(" ")[0] ?? "Usuário";

  // Dados para os cards de estatísticas (torna a renderização mais limpa)
  const statsData = [
    { title: "Chamados Abertos", value: openTickets.length, icon: <Clock className="w-8 h-8 text-amber-500" /> },
    { title: "Chamados Fechados", value: closedTickets.length, icon: <Check className="w-8 h-8 text-green-500" /> },
    { title: "Usuário", value: session.user.name ?? "Desconhecido", icon: <User className="w-8 h-8 text-muted-foreground" /> },
    ...(session.user.organizationId ? [{ title: "Organização", value: session.user.organizationId, icon: <Building className="w-8 h-8 text-muted-foreground" /> }] : []),
  ];

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
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
      
      <div className="mb-12">
        <ResourceCards />
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map(stat => <StatCard key={stat.title} {...stat} />)}
      </section>

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