import { trpc } from "@/lib/api/trpc-client";
import type {
  TaskConfigView,
  TaskItem,
  TaskItemListResponse,
  TaskListResponse,
} from "@dosc-syspro/contracts/tarefas";

export async function getTarefasListQuery(input: {
  page?: string;
  pageSize?: string;
  search?: string;
}) {
  return (await trpc.tarefas.list.query(input)) as TaskListResponse;
}

export async function getTarefasCompanyConfigQuery(companyId: string) {
  return (await trpc.tarefas.getCompanyConfig.query({ companyId })) as TaskConfigView;
}

export async function getTarefaQuery(id: string) {
  return (await trpc.tarefas.getTask.query({ id })) as TaskItem;
}

export async function getTarefasItemsQuery(input: {
  page?: string;
  pageSize?: string;
  year?: string;
  month?: string;
  type?: string;
  origin?: string;
  status?: string;
  dueFrom?: string;
  dueTo?: string;
  reconcileCurrentCompetence?: boolean;
  search?: string;
  companyId?: string;
}) {
  return (await trpc.tarefas.listTasks.query(input)) as TaskItemListResponse;
}
