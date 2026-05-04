import { getTaxNcmViewData } from "@/features/tax/application/tax-read.queries";
import { TaxNcmPanel } from "./TaxNcmPanel";

export async function TaxNcmContainer() {
  const items = await getTaxNcmViewData();

  return <TaxNcmPanel items={items} />;
}
