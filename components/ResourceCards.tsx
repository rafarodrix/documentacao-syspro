import Link from 'next/link';
import type { LucideProps } from 'lucide-react';
import type { FunctionComponent } from 'react';

// 1. Definimos um tipo para os dados dos links
export type ResourceLink = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactElement<LucideProps>;
};

// 2. O componente agora recebe um array de links como prop
interface ResourceCardsProps {
  links: ResourceLink[];
}

export function ResourceCards({ links }: ResourceCardsProps) {
  // 3. Os dados não são mais definidos aqui dentro
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {links.map((link) => (
        <Link
          key={link.title}
          href={link.href}
          target={link.href.startsWith('http') ? '_blank' : '_self'}
          rel="noopener noreferrer"
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