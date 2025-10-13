// Imports de Componentes e Tipos
import { HeroSection } from '@/components/home/HeroSection';
import { ResourceCards, type ResourceLink } from '@/components/ResourceCards';
import { ReleaseNotesSection } from '@/components/home/ReleaseNotesSection';
import { ContactSection } from '@/components/home/ContactSection';

// Imports de Ícones para os dados dos cards
import { BookOpen, HelpCircle, GraduationCap, Wrench } from 'lucide-react';

// Revalida a página a cada hora para buscar novas releases
export const revalidate = 3600;

export default function HomePage() {
  // Dados dos cards de navegação específicos para a Home Page
  const homeNavLinks: ResourceLink[] = [
    {
      title: 'Documentação Completa',
      description: 'Navegue por todos os módulos e funcionalidades.',
      href: '/docs/manual',
      icon: <BookOpen aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
    {
      title: 'Dúvidas Frequentes',
      description: 'Respostas rápidas para as perguntas mais comuns.',
      href: '/docs/duvidas',
      icon: <HelpCircle aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
    {
      title: 'Guias e Tutoriais',
      description: 'Aprenda tarefas com nossos guias práticos.',
      href: '/docs/treinamento',
      icon: <GraduationCap aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
    {
      title: 'Central de Suporte',
      description: 'Acesse o portal para abrir e gerenciar chamados.',
      href: '/portal', // Leva o usuário para a página do portal
      icon: <Wrench aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary" />,
    },
  ];

  return (
    <main className="flex-1 flex flex-col items-center p-6 md:p-12">
      
      {/* Seção 1: Título Principal */}
      <HeroSection />

      {/* Seção 2: Cards de Navegação */}
      <div className="w-full max-w-5xl mb-12 md:mb-20">
        <ResourceCards links={homeNavLinks} />
      </div>

      {/* Seção 3: Novidades de Versão (com busca de dados interna) */}
      <ReleaseNotesSection />
      
      {/* Seção 4: Contato */}
      <ContactSection />

    </main>
  );
}