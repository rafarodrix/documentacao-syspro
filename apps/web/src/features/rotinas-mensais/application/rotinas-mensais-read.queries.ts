import { trpc } from "@/lib/api/trpc-client";
import type {
  MonthlyRoutineCompanyConfigView,
  MonthlyRoutineCompetencyListResponse,
  MonthlyRoutineListResponse,
} from "@dosc-syspro/contracts/rotinas-mensais";

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

export async function getMonthlyRoutineCompetenciesQuery(input: {
  page?: string;
  pageSize?: string;
  year?: string;
  month?: string;
  status?: string;
  search?: string;
}) {
  return (await trpc.rotinasMensais.listCompetencies.query(input)) as MonthlyRoutineCompetencyListResponse;
}
