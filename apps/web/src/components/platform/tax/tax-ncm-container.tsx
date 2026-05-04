import { getTaxNcmViewData } from "@/features/tax/application/tax-read.queries";
import { TaxNcmPanel } from "./tax-ncm-panel";

export async function TaxNcmContainer() {
  const items = await getTaxNcmViewData();

  return <TaxNcmPanel items={items} />;
}
