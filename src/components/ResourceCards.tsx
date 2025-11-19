import Link from 'next/link';
import { ReactNode } from 'react';

// Tipos e Interfaces
export interface ResourceLink {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}

// Propriedades do componente ResourceCards
export interface ResourceCardsProps {
  links: ResourceLink[];
  layout?: 'horizontal' | 'vertical'; 
}

// Componente que renderiza uma série de cards de recursos com links
export function ResourceCards({ links, layout = 'horizontal' }: ResourceCardsProps) {

  const containerClasses = layout === 'vertical'
    ? 'flex flex-col gap-4' 
    : 'grid grid-cols-1 sm:grid-cols-2 gap-4'; 

  return (
    <div className={containerClasses}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          target={link.href.startsWith('http') ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="group flex items-start gap-4 p-4 border rounded-lg bg-card text-card-foreground hover:bg-muted/50 transition-colors"
        >
          <div>{link.icon}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              {link.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {link.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}