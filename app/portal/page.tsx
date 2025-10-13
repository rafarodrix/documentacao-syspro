import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

// Lógica e Tipos
import { authOptions } from "@/lib/auth";
import { getTicketsByUserId } from "@/lib/releases";

// Componentes e seus Tipos
import { ResourceCards, type ResourceLink } from "@/components/ResourceCards";
import { StatCard } from "@/components/portal/StatCard";
import { TicketList } from "@/components/portal/TicketList";

// Ícones
import {
    User,
    Building,
    PlusCircle,
    Check,
    Clock,
    Home,
    BookOpen,
    GraduationCap,
    Globe,
    Download
} from "lucide-react";

// Revalida a página a cada hora para buscar novos dados
export default async function PortalPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/portal");
    }

    // Buscar os tickets do usuário logado
    const allUserTickets = await getTicketsByUserId(session.user.id);
    const openTickets = allUserTickets.filter((t) => t.status !== "Fechado");
    const closedTickets = allUserTickets.filter((t) => t.status === "Fechado");
    const userName = session.user.name?.split(" ")[0] ?? "Usuário";

    // Links rápidos para o portal
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

    // Dados para os cards de estatísticas
    const statsData = [
        { title: "Chamados Abertos", value: openTickets.length, icon: <Clock className="w-8 h-8 text-amber-500" /> },
        { title: "Chamados Fechados", value: closedTickets.length, icon: <Check className="w-8 h-8 text-green-500" /> },
    ];

    //
    return (
        <main className="max-w-7xl mx-auto p-4 md:p-8">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Portal do Cliente</h1>
                        <p className="text-muted-foreground">
                            Bem-vindo(a) de volta, {userName}. Gerencie seus chamados e acesse nossos recursos.
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                <div className="lg:col-span-2 space-y-8">
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                <aside className="space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight border-b pb-2">
                        Recursos Rápidos
                    </h2>

                    <ResourceCards links={portalNavLinks} layout="vertical" />
                </aside>
            </div>
        </main>
    );
}