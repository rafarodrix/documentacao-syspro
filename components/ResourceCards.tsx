import Link from 'next/link';
import {
  BookOpen,
  HelpCircle,
  GraduationCap,
  Wrench,
} from 'lucide-react';

// --- Dados para os cards de navegação ---
const navLinks = [
  {
    title: 'Documentação Completa',
    description: 'Navegue por todos os módulos e funcionalidades.',
    href: '/docs/manual',
    icon: <BookOpen aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
  {
    title: 'Dúvidas Frequentes',
    description: 'Respostas rápidas para as perguntas mais comuns.',
    href: '/docs/duvidas',
    icon: <HelpCircle aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
  {
    title: 'Guias e Tutoriais',
    description: 'Aprenda tarefas com nossos guias práticos.',
    href: '/docs/treinamento',
    icon: <GraduationCap aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
  {
    title: 'Central de Suporte',
    description: 'Precisa de ajuda? Contate nossa equipe especializada.',
    href: '/docs/suporte',
    icon: <Wrench aria-hidden="true" className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />,
  },
];

// --- Componente de Cards de Recursos ---
export function ResourceCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {navLinks.map((link) => (
        <Link
          key={link.title}
          href={link.href}
          className="group block rounded-lg border bg-card p-5 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-1 hover:border-primary hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {link.icon}
          
          <h3 className="mt-3 text-lg font-semibold text-foreground">{link.title}</h3>
          
          <p className="mt-1 text-sm text-muted-foreground">
            {link.description}
          </p>
        </Link>
      ))}
    </div>
  );
}