import Link from 'next/link';
import { Ticket, ExternalLink } from 'lucide-react';
import type { UserTicket } from '@/lib/types';

interface TicketListProps {
  tickets: UserTicket[];
  title: string;
  emptyMessage: string;
}

export function TicketList({ tickets, title, emptyMessage }: TicketListProps) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
        <Ticket className="w-5 h-5 text-muted-foreground" />
        {title}
      </h2>

      {tickets.length === 0 ? (
        <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={ticket.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir ticket #${ticket.number}: ${ticket.title}`}
              className="group block rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    #{ticket.number} — {ticket.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Última atualização: {ticket.lastUpdate}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm flex-shrink-0 pt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    ticket.status === "Fechado"
                      ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  }`}>
                    {ticket.status}
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}