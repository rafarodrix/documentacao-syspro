import Link from "next/link";
import { Ticket as TicketIcon, ExternalLink, Calendar, AlertCircle } from "lucide-react";
import { Ticket } from "@/core/domain/entities/ticket";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TicketListProps {
  tickets: Ticket[];
  title: string;
  emptyMessage: string;
}

// Helper para manter consistência de cores com o Dashboard
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Aberto':
    case 'Novo':
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900";
    case 'Resolvido':
    case 'Fechado':
      return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900";
    case 'Em Análise':
    case 'Em Desenvolvimento':
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900";
    default:
      return "bg-gray-500/15 text-gray-700 dark:text-gray-400";
  }
};

export function TicketList({ tickets, title, emptyMessage }: TicketListProps) {
  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TicketIcon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              // Ajuste o link conforme sua rota (ex: link interno para detalhes ou link externo)
              // Se for externo (Zammad), você precisará construir a URL ou tê-la no objeto.
              // Exemplo assumindo link interno:
              href={`/client/chamados/${ticket.id}`}
              className="group block outline-none"
            >
              <Card className="transition-all duration-200 hover:border-primary/50 hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-primary">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* Lado Esquerdo: Título e Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-start justify-between sm:hidden">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getStatusColor(ticket.status))}>
                        {ticket.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {ticket.date}
                      </span>
                    </div>

                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      #{ticket.id} — {ticket.subject}
                    </p>

                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Atualizado em: {ticket.date}
                      </span>
                      <span>•</span>
                      <span>Prioridade: {ticket.priority}</span>
                    </div>
                  </div>

                  {/* Lado Direito: Status e Ação (Desktop) */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <Badge variant="outline" className={cn("px-2.5 py-0.5 text-xs font-medium", getStatusColor(ticket.status))}>
                      {ticket.status}
                    </Badge>
                    <ExternalLink className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>

                  {/* Mobile Footer Info (Prioridade) */}
                  <div className="sm:hidden text-xs text-muted-foreground pt-2 border-t mt-1 flex justify-between items-center">
                    <span>Prioridade: {ticket.priority}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>

                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}