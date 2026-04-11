import type {
  TaxAnexoListItem,
  TaxClassificationListViewData,
  TaxCredPresumidoListItem,
  TaxNcmListItem,
  TaxRulesGroupItem,
} from "@/features/tax/domain/model";
import {
  fetchTaxAnexosViewGateway,
  fetchTaxClassificationListViewGateway,
  fetchTaxCredPresumidoViewGateway,
  fetchTaxNcmViewGateway,
  fetchTaxRulesViewGateway,
} from "@/features/tax/infrastructure/tax.gateway";

export async function getTaxClassificationListViewData(): Promise<TaxClassificationListViewData> {
  return fetchTaxClassificationListViewGateway();
}

export async function getTaxRulesViewData(): Promise<TaxRulesGroupItem[]> {
  return fetchTaxRulesViewGateway();
}

export async function getTaxAnexosViewData(): Promise<TaxAnexoListItem[]> {
  return fetchTaxAnexosViewGateway();
}

export async function getTaxCredPresumidoViewData(): Promise<TaxCredPresumidoListItem[]> {
  return fetchTaxCredPresumidoViewGateway();
}

export async function getTaxNcmViewData(): Promise<TaxNcmListItem[]> {
  return fetchTaxNcmViewGateway();
}
