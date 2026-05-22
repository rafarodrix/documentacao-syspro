import { useEffect, useState } from "react";
import type { TaskItem } from "@dosc-syspro/contracts/tarefas";
import { trpc } from "@/lib/api/trpc-client";

export function useChatwootTarefasCount({ companyId }: { companyId: string }) {
  const [tarefasCount, setTarefasCount] = useState(0);

  useEffect(() => {
    if (!companyId) {
      setTarefasCount(0);
      return;
    }

    let cancelled = false;
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1);

    async function loadTarefasAvailability() {
      try {
        const response = await trpc.tarefas.listTasks.query({
          page: "1",
          pageSize: "100",
          year,
          month,
          status: "ALL",
        });

        if (cancelled) return;
        const nextCount = response.items.filter((item: TaskItem) => item.companyId === companyId).length;
        setTarefasCount(nextCount);
      } catch {
        if (cancelled) return;
        setTarefasCount(0);
      }
    }

    void loadTarefasAvailability();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { tarefasCount };
}
