"use server";

import type {
  CompanyActionResponse,
  CompanyRegistryLookupResponse,
  CompanyZammadEmailInput,
} from "@/features/company/domain/model";
import {
  createCompanyAction as createCompanyActionImpl,
  deleteCompanyAction as deleteCompanyActionImpl,
  lookupCompanyProfileByCnpjAction as lookupCompanyProfileByCnpjActionImpl,
  updateCompanyAction as updateCompanyActionImpl,
  updateCompanyStatusAction as updateCompanyStatusActionImpl,
} from "@/features/company/application/actions";

export async function lookupCompanyProfileByCnpjAction(
  ...args: Parameters<typeof lookupCompanyProfileByCnpjActionImpl>
): Promise<ReturnType<typeof lookupCompanyProfileByCnpjActionImpl> extends Promise<infer T> ? T : never> {
  return lookupCompanyProfileByCnpjActionImpl(...args);
}

export async function createCompanyAction(
  ...args: Parameters<typeof createCompanyActionImpl>
) {
  return createCompanyActionImpl(...args);
}

export async function updateCompanyAction(
  ...args: Parameters<typeof updateCompanyActionImpl>
) {
  return updateCompanyActionImpl(...args);
}

export async function updateCompanyStatusAction(
  ...args: Parameters<typeof updateCompanyStatusActionImpl>
) {
  return updateCompanyStatusActionImpl(...args);
}

export async function deleteCompanyAction(
  ...args: Parameters<typeof deleteCompanyActionImpl>
) {
  return deleteCompanyActionImpl(...args);
}

export type ActionResponse = CompanyActionResponse;
export type { CompanyRegistryLookupResponse, CompanyZammadEmailInput };
