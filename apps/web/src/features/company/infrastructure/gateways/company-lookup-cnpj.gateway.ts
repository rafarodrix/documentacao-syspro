"use client";

import type { CompanyActionResponse, CompanyRegistryLookupResponse } from "@/features/company/application/company-view.types";

function fallbackLookupErrorMessage(status: number) {
  return status > 0 ? `Falha HTTP ${status} ao consultar CNPJ.` : "Erro ao consultar CNPJ.";
}
import { trpc } from "@/lib/api/trpc-client";

export async function lookupCompanyProfileByCnpjClient(
  cnpj: string,
): Promise<CompanyActionResponse<CompanyRegistryLookupResponse>> {
  const normalizedCnpj = String(cnpj || "").replace(/\D/g, "");
  if (normalizedCnpj.length !== 14) {
    return { success: false, message: "Informe um CNPJ completo para consulta." };
  }

  try {
    const data = await trpc.companies.lookupCompanyProfileByCnpj.query({ cnpj: normalizedCnpj });
    return data as CompanyActionResponse<CompanyRegistryLookupResponse>;
  } catch {
    return {
      success: false,
      message: "Erro ao consultar CNPJ.",
    };
  }
}
