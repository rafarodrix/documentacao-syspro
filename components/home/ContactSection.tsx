import { MessagesSquare, Phone, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

// Sub-componente para evitar repetição
function ContactCard({ icon: Icon, title, description, contactInfo, href }: { icon: LucideIcon, title: string, description: string, contactInfo: string, href: string }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className="no-underline group block h-full">
      <div className="border bg-card rounded-lg p-5 h-full transition-colors group-hover:border-primary">
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{description}</p>
        <p className="text-sm font-medium text-foreground break-all">{contactInfo}</p>
      </div>
    </Link>
  );
}

export function ContactSection() {
  const contactMethods = [
    { icon: MessagesSquare, title: 'WhatsApp', description: 'Ideal para dúvidas rápidas e suporte ágil.', contactInfo: '(34) 99771-3731', href: 'https://wa.me/5534997713731' },
    { icon: Phone, title: 'Telefone', description: 'Para emergências e suporte por voz.', contactInfo: '(34) 99771-3731', href: 'tel:+5534997713731' },
    { icon: Mail, title: 'E-mail', description: 'Para solicitações detalhadas.', contactInfo: 'equipe@trilinksoftware.com.br', href: 'mailto:equipe@trilinksoftware.com.br' },
  ];

  return (
    <section className="w-full max-w-5xl border-t pt-12 md:pt-16">
      <h2 className="text-3xl font-bold mb-4 text-center">Precisa de Ajuda?</h2>
      <p className="text-muted-foreground mb-8 text-center">
        Se não encontrou o que procurava, nossa equipe está pronta para ajudar.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        {contactMethods.map(method => <ContactCard key={method.title} {...method} />)}
      </div>
    </section>
  );
}