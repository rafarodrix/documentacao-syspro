import { getTaxRulesViewData } from "@/features/tax/application/queries";
import { TaxRulesViewer } from "./TaxRulesViewer";

export async function TaxViewerContainer() {
    const data = await getTaxRulesViewData();

    return <TaxRulesViewer data={data} />;
}
