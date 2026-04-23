"use client";

import type { CompanyActionResponse, CompanyRegistryLookupResponse } from "@/features/company/domain/model";

function fallbackLookupErrorMessage(status: number) {
  return status > 0 ? `Falha HTTP ${status} ao consultar CNPJ.` : "Erro ao consultar CNPJ.";
}

export async function lookupCompanyProfileByCnpjClient(
  cnpj: string,
): Promise<CompanyActionResponse<CompanyRegistryLookupResponse>> {
  const normalizedCnpj = String(cnpj || "").replace(/\D/g, "");
  if (normalizedCnpj.length !== 14) {
    return { success: false, message: "Informe um CNPJ completo para consulta." };
  }

  try {
    const response = await fetch(`/api/companies/lookup-cnpj?cnpj=${encodeURIComponent(normalizedCnpj)}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    try {
      return (await response.json()) as CompanyActionResponse<CompanyRegistryLookupResponse>;
    } catch {
      return {
        success: false,
        message: fallbackLookupErrorMessage(response.status),
      };
    }
  } catch {
    return {
      success: false,
      message: "Erro ao consultar CNPJ.",
    };
  }
}
