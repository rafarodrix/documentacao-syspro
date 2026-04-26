"use server";

import type { CompanyStatusValue, CreateCompanyInput, CreateCompanyOutput } from "@dosc-syspro/contracts/company";
import { callWebApi } from "@/lib/web-api";
import { revalidateCadastrosViews } from "@/lib/cache-invalidation";
import type {
  CompanyActionResponse as ActionResponse,
  CompanyRegistryLookupResponse,
} from "@/features/company/domain/model";

async function apiRequest(path: string, init?: RequestInit) {
  return callWebApi(`/api${path}`, init);
}

async function parseActionResponse<T = void>(response: Response, fallbackMessage: string): Promise<ActionResponse<T>> {
  try {
    return (await response.json()) as ActionResponse<T>;
  } catch {
    return {
      success: false,
      message: fallbackMessage,
    } as ActionResponse<T>;
  }
}

export async function lookupCompanyProfileByCnpjAction(
  cnpj: string,
): Promise<ActionResponse<CompanyRegistryLookupResponse>> {
  const normalizedCnpj = String(cnpj || "").replace(/\D/g, "");
  if (normalizedCnpj.length !== 14) {
    return { success: false, message: "Informe um CNPJ completo para consulta." };
  }

  try {
    const response = await apiRequest(`/companies/lookup-cnpj?cnpj=${encodeURIComponent(normalizedCnpj)}`);
    return await parseActionResponse<CompanyRegistryLookupResponse>(response, "Erro ao consultar CNPJ.");
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
    const response = await apiRequest("/companies", {
      method: "POST",
      body: JSON.stringify({ data }),
    });

    const result = await parseActionResponse(response, "Erro ao cadastrar empresa.");
    if (result.success) {
      revalidateCadastrosViews();
    }

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
    const response = await apiRequest(`/companies/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    });

    const result = await parseActionResponse(response, "Erro ao atualizar empresa.");
    if (result.success) {
      revalidateCadastrosViews();
    }

    return result;
  } catch {
    return { success: false, message: "Erro ao atualizar empresa." };
  }
}

export async function updateCompanyStatusAction(id: string, status: CompanyStatusValue): Promise<ActionResponse> {
  try {
    const response = await apiRequest(`/companies/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });

    const result = await parseActionResponse(response, "Erro ao atualizar status da empresa.");
    if (result.success) {
      revalidateCadastrosViews();
    }

    return result;
  } catch {
    return { success: false, message: "Erro ao atualizar status da empresa." };
  }
}

export async function deleteCompanyAction(id: string): Promise<ActionResponse> {
  try {
    const response = await apiRequest(`/companies/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    const result = await parseActionResponse(response, "Erro ao excluir empresa.");
    if (result.success) {
      revalidateCadastrosViews();
    }

    return result;
  } catch {
    return { success: false, message: "Erro ao excluir empresa." };
  }
}
