import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

// Imports de lógica e tipos
import { authOptions } from "@/lib/auth";
import { getTicketsByUserId } from "@/lib/releases";

// Imports de componentes e tipos
import { ResourceCards, type ResourceLink } from "@/components/ResourceCards";
import { StatCard } from "@/components/portal/StatCard";
import { TicketList } from "@/components/portal/TicketList";

// Imports de ícones
import { User, Building, PlusCircle, Check, Clock, Home, BookOpen, HelpCircle, GraduationCap, Wrench, Globe, Download } from "lucide-react";

export default async function PortalPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/portal");
  }

  const allUserTickets = await getTicketsByUserId(session.user.id);
  const openTickets = allUserTickets.filter((t) => t.status !== "Fechado");
  const closedTickets = allUserTickets.filter((t) => t.status === "Fechado");
  const userName = session.user.name?.split(" ")[0] ?? "Usuário";

  // Array de links específico para o portal, incluindo Site e Downloads
  const portalNavLinks: ResourceLink[] = [
    {
      title: 'Documentação',
      description: 'Navegue por todos os módulos e funcionalidades.',
      href: '/docs/manual',
      icon: <BookOpen aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
    {
      title: 'Guias e Tutoriais',
      description: 'Aprenda tarefas com nossos guias práticos.',
      href: '/docs/treinamento',
      icon: <GraduationCap aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
    {
      title: 'Site Institucional',
      description: 'Conheça mais sobre a Trilink e nossas soluções.',
      href: 'https://www.trilink.com.br/',
      icon: <Globe aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
    {
      title: 'Área de Downloads',
      description: 'Acesse instaladores, atualizações e utilitários.',
      href: 'https://www.trilink.com.br/public/downloads',
      icon: <Download aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
  ];

  // ... (código dos statsData) ...

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" title="Voltar para o Início" className="text-muted-foreground hover:text-primary transition-colors">
            <Home className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portal do Cliente</h1>
            <p className="text-muted-foreground">
              Bem-vindo(a) de volta, {userName}.
            </p>
          </div>
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
        {/* Passamos o array de links específico do portal */}
        <ResourceCards links={portalNavLinks} />
      </div>

      {/* ... Resto da sua página (StatCard, TicketList) ... */}
    </main>
  );
}