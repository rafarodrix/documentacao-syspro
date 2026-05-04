import { getTaxAnexosViewData } from "@/features/tax/application/tax-read.queries";
import { TaxAnexosPanel } from "./TaxAnexosPanel";

export async function TaxAnexosContainer() {
  const anexos = await getTaxAnexosViewData();

  return <TaxAnexosPanel items={anexos} />;
}
