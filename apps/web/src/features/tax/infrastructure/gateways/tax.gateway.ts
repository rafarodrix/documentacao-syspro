import { callBackendApi } from "@/lib/backend-api-client";
import type {
  TaxAnexoListItem,
  TaxClassificationListViewData,
  TaxCredPresumidoListItem,
  TaxNcmListItem,
  TaxRulesGroupItem,
} from "@/features/tax/domain/model";

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function normalizeClassificationListViewData(data: TaxClassificationListViewData): TaxClassificationListViewData {
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      pRedIBS: item.pRedIBS ?? 0,
      pRedCBS: item.pRedCBS ?? 0,
    })),
  };
}

function normalizeRulesViewData(data: TaxRulesGroupItem[]): TaxRulesGroupItem[] {
  return data.map((group) => ({
    ...group,
    classifications: group.classifications.map((classification) => ({
      ...classification,
      startDate: parseDate(classification.startDate) ?? new Date(),
      endDate: parseDate(classification.endDate),
    })),
  }));
}

function normalizeAnexos(items: TaxAnexoListItem[]): TaxAnexoListItem[] {
  return items.map((item) => ({
    ...item,
    publishDate: parseDate(item.publishDate),
    startDate: parseDate(item.startDate),
    endDate: parseDate(item.endDate),
    lastUpdated: parseDate(item.lastUpdated) ?? new Date(),
  }));
}

function normalizeCredPresumido(items: TaxCredPresumidoListItem[]): TaxCredPresumidoListItem[] {
  return items.map((item) => ({
    ...item,
    publishDate: parseDate(item.publishDate),
    startDate: parseDate(item.startDate),
    endDate: parseDate(item.endDate),
  }));
}

function normalizeNcm(items: TaxNcmListItem[]): TaxNcmListItem[] {
  return items.map((item) => ({
    ...item,
    startDate: parseDate(item.startDate),
    endDate: parseDate(item.endDate),
    lastUpdated: parseDate(item.lastUpdated) ?? new Date(),
  }));
}

export async function fetchTaxClassificationListViewGateway(): Promise<TaxClassificationListViewData> {
  return normalizeClassificationListViewData(
    await callBackendApi<TaxClassificationListViewData>("tax", "/classifications"),
  );
}

export async function fetchTaxRulesViewGateway(): Promise<TaxRulesGroupItem[]> {
  return normalizeRulesViewData(await callBackendApi<TaxRulesGroupItem[]>("tax", "/rules"));
}

export async function fetchTaxAnexosViewGateway(): Promise<TaxAnexoListItem[]> {
  return normalizeAnexos(await callBackendApi<TaxAnexoListItem[]>("tax", "/anexos"));
}

export async function fetchTaxCredPresumidoViewGateway(): Promise<TaxCredPresumidoListItem[]> {
  return normalizeCredPresumido(await callBackendApi<TaxCredPresumidoListItem[]>("tax", "/cred-presumido"));
}

export async function fetchTaxNcmViewGateway(): Promise<TaxNcmListItem[]> {
  return normalizeNcm(await callBackendApi<TaxNcmListItem[]>("tax", "/ncm"));
}
