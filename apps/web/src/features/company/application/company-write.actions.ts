"use server";

import type {
  CompanyInactivationReasonValue,
  CompanyStatusValue,
  CreateCompanyInput,
  CreateCompanyOutput,
} from "@dosc-syspro/contracts/company";
import { trpc } from "@/lib/api/trpc-client";
import { revalidateCadastrosViews } from "@/lib/cache-invalidation";
import { onlyDigits } from "@/lib/utils";
import type {
  CompanyActionResponse as ActionResponse,
  CompanyRegistryLookupResponse,
} from "@/features/company/application/company-view.types";

export async function lookupCompanyProfileByCnpjAction(
  cnpj: string,
): Promise<ActionResponse<CompanyRegistryLookupResponse>> {
  const normalizedCnpj = onlyDigits(cnpj);
  if (normalizedCnpj.length !== 14) {
    return { success: false, message: "Informe um CNPJ completo para consulta." };
  }

  try {
    const data = await trpc.companies.lookupCompanyProfileByCnpj.query({ cnpj: normalizedCnpj });
    return data as ActionResponse<CompanyRegistryLookupResponse>;
  } catch {
    return {
      success: false,
      message: "Erro ao consultar CNPJ.",
    };
  }
}

export async function createCompanyAction(
  data: CreateCompanyInput | CreateCompanyOutput,
): Promise<ActionResponse> {
  try {
    const result = await trpc.companies.create.mutate({ data: data as any }) as ActionResponse;
    if (!result.success) {
      return result;
    }
    revalidateCadastrosViews();
    return result;
  } catch {
    return { success: false, message: "Erro ao cadastrar empresa." };
  }
}

export async function updateCompanyAction(
  id: string,
  data: CreateCompanyInput | CreateCompanyOutput,
): Promise<ActionResponse> {
  try {
    const result = await trpc.companies.update.mutate({ id, data: data as any }) as ActionResponse;
    if (!result.success) {
      return result;
    }
    revalidateCadastrosViews();
    return result;
  } catch {
    return { success: false, message: "Erro ao atualizar empresa." };
  }
}

export async function updateCompanyStatusAction(
  id: string,
  status: CompanyStatusValue,
  reason?: CompanyInactivationReasonValue | null,
  details?: string | null,
): Promise<ActionResponse> {
  try {
    const result = await trpc.companies.updateStatus.mutate({
      id,
      data: { status, reason: reason ?? null, details: details ?? null },
    }) as ActionResponse;
    if (!result.success) {
      return result;
    }
    revalidateCadastrosViews();
    return result;
  } catch {
    return { success: false, message: "Erro ao atualizar status da empresa." };
  }
}

export async function deleteCompanyAction(id: string): Promise<ActionResponse> {
  try {
    const result = await trpc.companies.remove.mutate({ id }) as ActionResponse;
    if (!result.success) {
      return result;
    }
    revalidateCadastrosViews();
    return result;
  } catch {
    return { success: false, message: "Erro ao excluir empresa." };
  }
}
