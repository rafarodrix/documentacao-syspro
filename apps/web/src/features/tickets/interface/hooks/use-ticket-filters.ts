"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";
import type { ClosedTicketsWindow, TicketTeamFilter } from "../components/types";

export function useTicketFilters(initialSearch: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Sync internal search state with URL when initialSearch changes (e.g. from SSR)
  useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  // Debounced search sync to URL
  useEffect(() => {
    const nextValue = searchTerm.trim();
    const currentValue = (searchParams?.get("search") || "").trim();
    if (nextValue === currentValue) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (nextValue) {
        params.set("search", nextValue);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, router, searchParams, searchTerm]);

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      mutate(params);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      updateParams((params) => {
        params.set("page", String(Math.max(1, nextPage)));
      });
    },
    [updateParams]
  );

  const setQueueFilter = useCallback(
    (nextQueue: QueueKey) => {
      updateParams((params) => {
        params.set("queue", nextQueue);
        params.set("page", "1");
      });
    },
    [updateParams]
  );

  const setStatusFilter = useCallback(
    (nextStatus: TicketStatusGroup) => {
      updateParams((params) => {
        if (nextStatus === "open") {
          params.delete("status");
        } else {
          params.set("status", nextStatus);
        }
        params.set("page", "1");
      });
    },
    [updateParams]
  );

  const setClosedWindowFilter = useCallback(
    (nextWindow: ClosedTicketsWindow) => {
      updateParams((params) => {
        if (nextWindow === "30d") {
          params.delete("closedWindow");
        } else {
          params.set("closedWindow", nextWindow);
        }
        params.set("page", "1");
      });
    },
    [updateParams]
  );

  const setTeamFilter = useCallback(
    (nextTeam: TicketTeamFilter) => {
      updateParams((params) => {
        if (nextTeam === "all") {
          params.delete("team");
        } else {
          params.set("team", nextTeam);
        }
        params.set("page", "1");
      });
    },
    [updateParams]
  );

  return {
    searchTerm,
    setSearchTerm,
    goToPage,
    setQueueFilter,
    setStatusFilter,
    setClosedWindowFilter,
    setTeamFilter,
    isPending,
  };
}
