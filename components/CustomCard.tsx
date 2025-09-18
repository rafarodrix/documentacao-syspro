import { ReactNode } from 'react';
import { MessagesSquare, Phone, Mail, Clock, Moon } from 'lucide-react'; // Ícones do Lucide

// Definição do CustomCard
interface CustomCardProps {
  title: ReactNode;
  href?: string; // Tornei href opcional, já que os cartões de horário não têm link
  icon?: ReactNode;
  description?: ReactNode;
  external?: boolean;
  children?: ReactNode;
}

export function CustomCard({
  title,
  href,
  icon,
  description,
  external = true,
  children,
  ...props
}: CustomCardProps) {
  // Se não houver href, renderiza como div (sem link)
  const Container = href ? 'a' : 'div';

  return (
    <Container
      href={href}
      className={`block no-underline h-full ${!href ? 'cursor-default' : ''}`}
      target={href && external ? "_blank" : undefined}
      rel={href && external ? "noopener noreferrer" : undefined}
      {...props}
    >
      <div className="p-4 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg h-full flex flex-col">
        <div className="flex items-center gap-2">
          {icon && <div className="text-neutral-600 dark:text-neutral-400">{icon}</div>}
          <div className="text-black dark:text-white font-medium">{title}</div>
        </div>
        {(description || children) && (
          <div className="mt-2 text-neutral-600 dark:text-neutral-400 text-sm flex-1">
            {description ? description : (
              <ul className="list-disc list-inside">
                {children}
              </ul>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}