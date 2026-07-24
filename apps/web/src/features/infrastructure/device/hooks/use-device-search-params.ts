"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type {
  DeviceConnectivityStatus,
  DeviceHealthStatus,
  DeviceLifecycleStatus,
} from "@dosc-syspro/contracts";

const LIFECYCLE_MAP: Record<string, DeviceLifecycleStatus | "ALL"> = {
  MANAGED: "MANAGED",
  GERENCIADOS: "MANAGED",
  AWAITING_LINK: "AWAITING_LINK",
  PENDING: "AWAITING_LINK",
  DISCOVERED: "DISCOVERED",
  DESCOBERTOS: "DISCOVERED",
  ARCHIVED: "ARCHIVED",
  ARQUIVADOS: "ARCHIVED",
  ALL: "ALL",
};

export function useDeviceSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryParams = useMemo(() => {
    const rawQuery = searchParams.get("query") ?? searchParams.get("q") ?? "";
    // Never read page `tab` (dispositivos/operacao) as lifecycle — only `lifecycle`.
    const rawLifecycle = (searchParams.get("lifecycle") ?? "MANAGED").toUpperCase();
    const rawConnectivity = (searchParams.get("connectivity") ?? "ALL").toUpperCase();
    const rawHealth = (searchParams.get("health") ?? "ALL").toUpperCase();
    const rawCompanyId = searchParams.get("companyId") ?? undefined;
    const rawPage = Math.max(1, Number(searchParams.get("page")) || 1);
    const rawPageSize = Math.max(1, Number(searchParams.get("pageSize")) || 25);
    const rawSort = searchParams.get("sort") ?? undefined;

    return {
      query: rawQuery,
      lifecycle: (LIFECYCLE_MAP[rawLifecycle] ?? "MANAGED") as DeviceLifecycleStatus | "ALL",
      connectivity: (["ONLINE", "STALE", "OFFLINE", "MISSING"].includes(rawConnectivity)
        ? rawConnectivity
        : "ALL") as DeviceConnectivityStatus | "ALL",
      health: (["HEALTHY", "WARNING", "CRITICAL", "UNEVALUATED"].includes(rawHealth)
        ? rawHealth
        : "ALL") as DeviceHealthStatus | "ALL",
      companyId: rawCompanyId,
      page: rawPage,
      pageSize: rawPageSize,
      sort: rawSort,
    };
  }, [searchParams]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (queryParams.connectivity !== "ALL") count++;
    if (queryParams.health !== "ALL") count++;
    if (queryParams.companyId) count++;
    return count;
  }, [queryParams]);

  const updateParams = useCallback(
    (updates: Partial<Record<string, string | number | null | undefined>>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === undefined || val === "" || val === "ALL" || val === "all") {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });

      // Drop legacy fake capability filter if still present in the URL.
      next.delete("capabilities");

      if (resetPage && !("page" in updates)) {
        next.set("page", "1");
      }

      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return {
    queryParams,
    activeFilterCount,
    updateParams,
  };
}
