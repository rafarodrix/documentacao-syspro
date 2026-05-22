"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ticketModuleDetailsResponseSchema } from "@dosc-syspro/contracts/ticket";
import { mapTicketModuleDetailsResponse } from "@/features/tickets/application/ticket-details.mapper";
import { withTechnicalResourceArticles } from "../components/ticket-details.helpers";
import { TICKET_HISTORY_PAGE_SIZE } from "../components/ticket-details.constants";
import type { TicketArticleItem, TicketDetailsItem, TicketMessagePagination } from "../components/ticket-view.types";

export function useTicketTimeline(
  ticket: TicketDetailsItem | undefined,
  initialArticles: TicketArticleItem[],
  initialPagination: TicketMessagePagination | undefined,
) {
  const [timelineArticles, setTimelineArticles] = useState<TicketArticleItem[]>(() =>
    ticket ? withTechnicalResourceArticles(initialArticles, ticket) : initialArticles,
  );
  const [timelinePagination, setTimelinePagination] = useState<TicketMessagePagination | undefined>(initialPagination);
  const [isLoadingOlderArticles, setIsLoadingOlderArticles] = useState(false);

  useEffect(() => {
    setTimelineArticles(ticket ? withTechnicalResourceArticles(initialArticles, ticket) : initialArticles);
  }, [initialArticles, ticket]);

  useEffect(() => {
    setTimelinePagination(initialPagination);
  }, [initialPagination]);

  async function loadOlderArticles() {
    if (!ticket || isLoadingOlderArticles || !timelinePagination?.hasNextPage) return false;

    setIsLoadingOlderArticles(true);
    try {
      const query = new URLSearchParams({
        page: String(timelinePagination.page + 1),
        pageSize: String(timelinePagination.pageSize || TICKET_HISTORY_PAGE_SIZE),
      });
      const response = await fetch(`/api/tickets/${ticket.id}?${query.toString()}`, { cache: "no-store" });
      const payload = ticketModuleDetailsResponseSchema.parse(await response.json());
      const mapped = mapTicketModuleDetailsResponse(payload);

      if (!mapped.success) {
        toast.error(mapped.error || "Nao foi possivel carregar o historico anterior.");
        return false;
      }

      const nextArticles = withTechnicalResourceArticles(mapped.articles, ticket);
      setTimelineArticles((current) => {
        const seen = new Set<string>();
        return [...nextArticles, ...current].filter((article) => {
          const key = String(article.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
      setTimelinePagination(mapped.messagePagination);
      return true;
    } catch (err) {
      console.error("Erro ao carregar historico anterior do ticket:", err);
      toast.error("Nao foi possivel carregar o historico anterior.");
      return false;
    } finally {
      setIsLoadingOlderArticles(false);
    }
  }

  return { timelineArticles, timelinePagination, isLoadingOlderArticles, loadOlderArticles };
}
