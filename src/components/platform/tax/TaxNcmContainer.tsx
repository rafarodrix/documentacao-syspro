import { getTaxNcmViewData } from "@/features/tax/application/queries";
import { TaxNcmPanel } from "./TaxNcmPanel";

export async function TaxNcmContainer() {
  const items = await getTaxNcmViewData();

  return <TaxNcmPanel items={items} />;
}
