"use client";

import { useEffect, useState, useTransition } from "react";
import type { DeviceListQueryParams, DeviceListResponse } from "@dosc-syspro/contracts";
import { trpc } from "@/lib/api/trpc-client";

export function useDeviceListQuery(params: DeviceListQueryParams, initialData?: DeviceListResponse | null) {
  const [data, setData] = useState<DeviceListResponse | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);
        const result = (await trpc.remote.devices.query(params)) as DeviceListResponse;
        if (!isCancelled) {
          setData(result);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error("Falha ao carregar dispositivos."));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    startTransition(() => {
      fetchData();
    });

    return () => {
      isCancelled = true;
    };
  }, [
    params.query,
    params.lifecycle,
    params.connectivity,
    params.health,
    params.companyId,
    params.page,
    params.pageSize,
    params.sort,
  ]);

  const refetch = async () => {
    try {
      setIsLoading(true);
      const result = (await trpc.remote.devices.query(params)) as DeviceListResponse;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Falha ao atualizar dispositivos."));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading: isLoading || isPending,
    error,
    refetch,
  };
}
