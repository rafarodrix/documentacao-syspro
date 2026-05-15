import { trpc } from "@/lib/api/trpc-client";
import type { MonthlyRoutineCompanyConfigView, MonthlyRoutineListResponse } from "@dosc-syspro/contracts/rotinas-mensais";

export async function getMonthlyRoutineListQuery(input: {
  page?: string;
  pageSize?: string;
  search?: string;
}) {
  return (await trpc.rotinasMensais.list.query(input)) as MonthlyRoutineListResponse;
}

export async function getMonthlyRoutineCompanyConfigQuery(companyId: string) {
  return (await trpc.rotinasMensais.getCompanyConfig.query({ companyId })) as MonthlyRoutineCompanyConfigView;
}
