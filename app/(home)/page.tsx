import Link from 'next/link';
import { BookOpen, HelpCircle, GraduationCap, Rocket, MessagesSquare, Phone, Mail } from 'lucide-react';

// Dados para os cards de navegação
const navLinks = [
  {
    title: 'Documentação Completa',
    description: 'Navegue por todos os módulos e funcionalidades.',
    href: '/docs/manual',
    icon: <BookOpen className="w-8 h-8 text-muted-foreground" />,
  },
  {
    title: 'Dúvidas Frequentes',
    description: 'Respostas rápidas para as perguntas mais comuns.',
    href: '/docs/duvidas',
    icon: <HelpCircle className="w-8 h-8 text-muted-foreground" />,
  },
  {
    title: 'Guias e Tutoriais',
    description: 'Aprenda tarefas com nossos guias práticos.',
    href: '/docs/treinamento',
    icon: <GraduationCap className="w-8 h-8 text-muted-foreground" />,
  },
  {
    title: 'Novidades de Versão',
    description: 'Veja o que há de novo a cada mês no Syspro ERP.',
    href: '/docs/suporte/releasenotes',
    icon: <Rocket className="w-8 h-8 text-muted-foreground" />,
  },
];

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center p-6 md:p-12 text-center">
      
      <section className="max-w-3xl mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Central de Ajuda Syspro ERP
        </h1>
        <p className="text-lg text-muted-foreground">
          Bem-vindo à sua fonte de informações completa. Encontre tudo o que precisa para dominar o sistema, dos primeiros passos às últimas novidades.
        </p>
      </section>

      <section className="w-full max-w-5xl mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {navLinks.map((link) => (
            <Link key={link.title} href={link.href} className="no-underline group block h-full">
              {/* Usando um div estilizado como Card */}
              <div className="h-full p-5 text-center flex flex-col items-center justify-center border bg-card rounded-lg transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1 hover:border-primary">
                {link.icon}
                <h3 className='font-semibold mt-4 mb-1 text-foreground'>{link.title}</h3>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      
      <section className="w-full max-w-5xl border-t pt-16">
        <h2 className="text-3xl font-bold mb-4">Precisa de Ajuda?</h2>
        <p className="text-muted-foreground mb-8">
          Se não encontrou o que procurava, nossa equipe de suporte está pronta para ajudar.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* Card WhatsApp */}
          <a href="https://wa.me/5534997713731" target="_blank" rel="noopener noreferrer" className="no-underline group block h-full">
            <div className="border bg-card rounded-lg p-4 h-full transition-colors group-hover:border-primary">
              <div className="flex items-center gap-3 mb-2">
                <MessagesSquare className="w-6 h-6 text-green-500" />
                <h3 className="font-semibold text-foreground">WhatsApp</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Ideal para dúvidas rápidas e suporte ágil.</p>
              <p className="text-sm font-medium text-foreground">(34) 99771-3731</p>
            </div>
          </a>
          {/* Card Telefone */}
          <a href="tel:+5534997713731" className="no-underline group block h-full">
            <div className="border bg-card rounded-lg p-4 h-full transition-colors group-hover:border-primary">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-6 h-6 text-blue-500" />
                <h3 className="font-semibold text-foreground">Telefone</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Para emergências e suporte por voz.</p>
              <p className="text-sm font-medium text-foreground">(34) 99771-3731</p>
            </div>
          </a>
          {/* Card E-mail */}
          <a href="mailto:equipe@trilinksoftware.com.br" className="no-underline group block h-full">
            <div className="border bg-card rounded-lg p-4 h-full transition-colors group-hover:border-primary">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-6 h-6 text-amber-500" />
                <h3 className="font-semibold text-foreground">E-mail</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Para solicitações detalhadas.</p>
              <p className="text-sm font-medium text-foreground break-all">equipe@trilinksoftware.com.br</p>
            </div>
          </a>
        </div>
      </section>
    </main>
  );
}