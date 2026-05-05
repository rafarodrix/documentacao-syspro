import { getTaxAnexosViewData } from "@/features/tax/application/tax-read.queries";
import { TaxAnexosPanel } from "./tax-anexos-panel";

export async function TaxAnexosContainer() {
  const anexos = await getTaxAnexosViewData();

  return <TaxAnexosPanel items={anexos} />;
}
