import { getTaxAnexosViewData } from "@/features/tax/application/queries";
import { TaxAnexosPanel } from "./TaxAnexosPanel";

export async function TaxAnexosContainer() {
  const anexos = await getTaxAnexosViewData();

  return <TaxAnexosPanel items={anexos} />;
}
