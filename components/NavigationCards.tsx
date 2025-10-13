import Link from "next/link";
import { LucideIcon } from "lucide-react";

// Definimos os tipos para as props
type NavLink = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

interface NavigationCardsProps {
  links: NavLink[];
  title?: string;
}

// O componente agora recebe as props
export function NavigationCards({ links, title = "Recursos Rápidos" }: NavigationCardsProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            target={link.href.startsWith("http") ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="group block p-4 border rounded-lg bg-card shadow-sm transition-all hover:border-primary hover:shadow-lg hover:-translate-y-1"
          >
            <link.icon className="w-8 h-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
            <h3 className="font-semibold text-foreground">{link.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}