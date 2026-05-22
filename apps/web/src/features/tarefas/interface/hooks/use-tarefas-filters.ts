import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/api/trpc-client";
import type { TaskItemListResponse } from "@dosc-syspro/contracts/tarefas";
import { STATUS_FILTER_OPTIONS } from "../components/tarefas-page.constants";

interface UseTarefasFiltersParams {
  search: string;
  status: string;
  type: string;
  origin: string;
  year: string;
  month: string;
  dueFrom: string;
  dueTo: string;
  tasks: TaskItemListResponse;
}

export function useTarefasFilters({
  search,
  status,
  type,
  origin,
  year,
  month,
  dueFrom,
  dueTo,
  tasks,
}: UseTarefasFiltersParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const deferredSearch = useDeferredValue(searchDraft);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    const normalizedCurrent = (searchParams.get("search") ?? "").trim();
    const normalizedNext = deferredSearch.trim();
    if (normalizedCurrent === normalizedNext) return;

    const handle = window.setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (normalizedNext) {
          params.set("search", normalizedNext);
        } else {
          params.delete("search");
        }
        params.delete("page");
        router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
      });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [deferredSearch, pathname, router, searchParams]);

  function setStatusFilter(nextStatus: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus && nextStatus !== "ALL" && nextStatus !== "OPEN") {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function setTypeFilter(nextType: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextType && nextType !== "ALL") {
        params.set("type", nextType);
      } else {
        params.delete("type");
      }
      if (nextType === "TAREFA" && params.get("origin") === "MONTHLY") {
        params.delete("origin");
      }
      if (nextType === "ROTINA_MENSAL") {
        const currentOrigin = params.get("origin");
        if (currentOrigin === "MANUAL" || currentOrigin === "TICKET") {
          params.set("origin", "MONTHLY");
        }
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function setOriginFilter(nextOrigin: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextOrigin && nextOrigin !== "ALL") {
        params.set("origin", nextOrigin);
      } else {
        params.delete("origin");
      }
      if (nextOrigin === "MANUAL" || nextOrigin === "TICKET") {
        params.set("type", "TAREFA");
      }
      if (nextOrigin === "MONTHLY") {
        params.set("type", "ROTINA_MENSAL");
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function setCompetenceFilter(nextValue: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextValue) {
        const [nextYear, nextMonth] = nextValue.split("-");
        if (nextYear) params.set("year", nextYear);
        if (nextMonth) params.set("month", String(Number(nextMonth)));
      } else {
        params.delete("year");
        params.delete("month");
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function setDueDateFilter(key: "dueFrom" | "dueTo", value: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function setPage(nextPage: number) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(nextPage));
      }
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function clearFilters() {
    setSearchDraft("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("search");
      params.delete("status");
      params.delete("type");
      params.delete("origin");
      params.delete("year");
      params.delete("month");
      params.delete("dueFrom");
      params.delete("dueTo");
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function handleSyncMonth() {
    startSyncTransition(async () => {
      try {
        const result = await trpc.tarefas.syncCompetencies.mutate({
          year: tasks.year ?? undefined,
          month: tasks.month ?? undefined,
        });
        toast.success(`${result.message} ${result.generated} gerada(s), ${result.updated} atualizada(s).`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel sincronizar as rotinas do mes.");
      }
    });
  }

  const currentMonthValue = `${year}-${String(Number(month)).padStart(2, "0")}`;
  const now = new Date();
  const defaultMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const hasActiveFilters =
    Boolean(search.trim()) ||
    status !== "OPEN" ||
    type !== "ALL" ||
    origin !== "ALL" ||
    currentMonthValue !== defaultMonthValue ||
    Boolean(dueFrom) ||
    Boolean(dueTo);

  const competenceLabel =
    tasks.year && tasks.month ? `${String(tasks.month).padStart(2, "0")}/${tasks.year}` : null;
  const isManualBacklogView = type === "TAREFA";
  const shouldUseCompetenceFilter = origin === "MONTHLY" || (origin === "ALL" && type !== "TAREFA");
  const shouldUseOperationalDueFilter = origin === "MANUAL" || origin === "TICKET" || type === "TAREFA";

  const statusFilterOptions = STATUS_FILTER_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    count: tasks.summary[option.countKey],
  }));

  return {
    isPending,
    isSyncing,
    searchDraft,
    setSearchDraft,
    setStatusFilter,
    setTypeFilter,
    setOriginFilter,
    setCompetenceFilter,
    setDueDateFilter,
    setPage,
    clearFilters,
    handleSyncMonth,
    currentMonthValue,
    hasActiveFilters,
    competenceLabel,
    isManualBacklogView,
    shouldUseCompetenceFilter,
    shouldUseOperationalDueFilter,
    statusFilterOptions,
  };
}
