import type {
  TaxAnexoListItem,
  TaxClassificationListViewData,
  TaxCredPresumidoListItem,
  TaxNcmListItem,
  TaxRulesGroupItem,
} from "@/features/tax/domain/tax.types";

export interface TaxReadRepository {
  getClassificationListView(): Promise<TaxClassificationListViewData>;
  getRulesView(): Promise<TaxRulesGroupItem[]>;
  getAnexosView(): Promise<TaxAnexoListItem[]>;
  getCredPresumidoView(): Promise<TaxCredPresumidoListItem[]>;
  getNcmView(): Promise<TaxNcmListItem[]>;
}
